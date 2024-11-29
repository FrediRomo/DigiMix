/* USER CODE BEGIN Header */
	/**
	  ******************************************************************************
	  * @file           : main.c
	  * @brief          : Main program body
	  ******************************************************************************
	  * @attention
	  *
	  * Copyright (c) 2024 STMicroelectronics.
	  * All rights reserved.
	  *
	  * This software is licensed under terms that can be found in the LICENSE file
	  * in the root directory of this software component.
	  * If no LICENSE file comes with this software, it is provided AS-IS.
	  *
	  ******************************************************************************
	  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "cmsis_os.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
	#include <string.h>
	#include <math.h>
	#include <stdlib.h>
	#include <stdarg.h>
	#include <stdbool.h>

	#include "IFX_PeakingFilter.h"
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */
	#define FLOAT_TO_INT24(value) ((int32_t)((value) * 8388608.0f))  // Scale the float value to 16-bit range
	#define FLOAT_TO_INT16(value) ((int16_t)((value) * 32767.0f))  // Scale the float value to 16-bit range
	#define INT16_TO_FLOAT(value) ((float)(value) / 32767.0f)       // Convert from int16_t to float
	#define INT24_TO_FLOAT(value) ((float)(value) / 8388608.0f) // 24-bit to float

	#define ARRAY_LEN(x)            (sizeof(x) / sizeof((x)[0]))

	#define SAMPLE_RATE_HZ 48000.0f

	//192
	#define BUFFER_SIZE 192
/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */

	#ifndef HSEM_ID_0
	#define HSEM_ID_0 (0U) /* HW semaphore 0*/
	#endif

/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */
/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/

I2S_HandleTypeDef hi2s1;
I2S_HandleTypeDef hi2s3;
DMA_HandleTypeDef hdma_spi3_rx;
DMA_HandleTypeDef hdma_spi3_tx;

UART_HandleTypeDef huart2;
UART_HandleTypeDef huart3;
DMA_HandleTypeDef hdma_usart2_rx;
DMA_HandleTypeDef hdma_usart2_tx;
DMA_HandleTypeDef hdma_usart3_rx;
DMA_HandleTypeDef hdma_usart3_tx;

/* Definitions for filterTask */
osThreadId_t filterTaskHandle;
const osThreadAttr_t filterTask_attributes = {
  .name = "filterTask",
  .stack_size = 128 * 4,
  .priority = (osPriority_t) osPriorityNormal,
};
/* Definitions for processData */
osThreadId_t processDataHandle;
const osThreadAttr_t processData_attributes = {
  .name = "processData",
  .stack_size = 256 * 4,
  .priority = (osPriority_t) osPriorityAboveNormal,
};
/* Definitions for uartQueue */
osMessageQueueId_t uartQueueHandle;
const osMessageQueueAttr_t uartQueue_attributes = {
  .name = "uartQueue"
};
/* Definitions for i2sHalfFull */
osSemaphoreId_t i2sHalfFullHandle;
const osSemaphoreAttr_t i2sHalfFull_attributes = {
  .name = "i2sHalfFull"
};
/* Definitions for i2sFull */
osSemaphoreId_t i2sFullHandle;
const osSemaphoreAttr_t i2sFull_attributes = {
  .name = "i2sFull"
};
/* Definitions for uartFull */
osSemaphoreId_t uartFullHandle;
const osSemaphoreAttr_t uartFull_attributes = {
  .name = "uartFull"
};
/* USER CODE BEGIN PV */
	typedef struct {
		uint16_t centerFrequency;
		float qFactor;
		float gain;
	} FilterParams;

	// CH1 & CH2
	__attribute__ ((section(".rxBuffer1"), used)) __attribute__ ((aligned (32))) uint16_t adcData[BUFFER_SIZE*2] = {0};
	__attribute__ ((section(".txBuffer1"), used)) __attribute__ ((aligned (32))) uint16_t dacData[BUFFER_SIZE*2] = {0};

	__attribute__ ((section(".txUARTBuffer1"), used)) __attribute__ ((aligned (32))) uint16_t uartBuffer[BUFFER_SIZE*2] = {0};

	// CH3 & CH4
	//__attribute__ ((section(".rxBuffer2"), used)) __attribute__ ((aligned (32))) uint16_t adcData2[BUFFER_SIZE*2] = {0};
	//__attribute__ ((section(".txBuffer2"), used)) __attribute__ ((aligned (32))) uint16_t dacData2[BUFFER_SIZE*2] = {0};

	// UART
	__attribute__ ((section(".rxUARTBuffer"), used)) __attribute__ ((aligned (32))) uint8_t uartData[65] = {0};


	static volatile uint16_t *inBufPtr;
	static volatile uint16_t *outBufPtr = &dacData[0];

	uint8_t dataReadyFlag;

	float vch1 = 1.0f;
	float vch2 = 1.0f;

	IFX_PeakingFilter filt1;
	IFX_PeakingFilter filt2;
	IFX_PeakingFilter filt3;
	//IFX_PeakingFilter filt4;
	//IFX_PeakingFilter filt5;


/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
void PeriphCommonClock_Config(void);
static void MPU_Config(void);
static void MX_GPIO_Init(void);
static void MX_DMA_Init(void);
static void MX_I2S3_Init(void);
static void MX_USART3_UART_Init(void);
static void MX_I2S1_Init(void);
static void MX_USART2_UART_Init(void);
void setFilterTask(void *argument);
void processDataTask(void *argument);

/* USER CODE BEGIN PFP */
	void UART_Printf(const char* fmt, ...);
	void processData();
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{
  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */
/* USER CODE BEGIN Boot_Mode_Sequence_0 */
	  int32_t timeout;
/* USER CODE END Boot_Mode_Sequence_0 */

  /* MPU Configuration--------------------------------------------------------*/
  MPU_Config();

  /* Enable I-Cache---------------------------------------------------------*/
  SCB_EnableICache();

  /* Enable D-Cache---------------------------------------------------------*/
  SCB_EnableDCache();

/* USER CODE BEGIN Boot_Mode_Sequence_1 */
	  /* Wait until CPU2 boots and enters in stop mode or timeout*/
	  timeout = 0xFFFF;
	  while((__HAL_RCC_GET_FLAG(RCC_FLAG_D2CKRDY) != RESET) && (timeout-- > 0));
	  if ( timeout < 0 )
	  {
	  Error_Handler();
	  }
/* USER CODE END Boot_Mode_Sequence_1 */
  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

/* Configure the peripherals common clocks */
  PeriphCommonClock_Config();
/* USER CODE BEGIN Boot_Mode_Sequence_2 */
	/* When system initialization is finished, Cortex-M7 will release Cortex-M4 by means of
	HSEM notification */
	/*HW semaphore Clock enable*/
	__HAL_RCC_HSEM_CLK_ENABLE();
	/*Take HSEM */
	HAL_HSEM_FastTake(HSEM_ID_0);
	/*Release HSEM in order to notify the CPU2(CM4)*/
	HAL_HSEM_Release(HSEM_ID_0,0);
	/* wait until CPU2 wakes up from stop mode */
	timeout = 0xFFFF;
	while((__HAL_RCC_GET_FLAG(RCC_FLAG_D2CKRDY) == RESET) && (timeout-- > 0));
	if ( timeout < 0 )
	{
	Error_Handler();
	}
/* USER CODE END Boot_Mode_Sequence_2 */

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_DMA_Init();
  MX_I2S3_Init();
  MX_USART3_UART_Init();
  MX_I2S1_Init();
  MX_USART2_UART_Init();
  /* USER CODE BEGIN 2 */
	  memset(dacData, 0, sizeof(dacData));

	  IFX_PeakingFilter_Init(&filt1, SAMPLE_RATE_HZ);
	  IFX_PeakingFilter_Init(&filt2, SAMPLE_RATE_HZ);
	  IFX_PeakingFilter_Init(&filt3, SAMPLE_RATE_HZ);
	  //  IFX_PeakingFilter_Init(&filt4, SAMPLE_RATE_HZ);
	  //  IFX_PeakingFilter_Init(&filt5, SAMPLE_RATE_HZ);

	  UART_Printf("Readyy!\r\n");

	  IFX_PeakingFilter_SetParameters(&filt1, 53.0f, 1.8f, 5.0f);
	  IFX_PeakingFilter_SetParameters(&filt2, 1.0f, 1.0f, 1.0f);
	  IFX_PeakingFilter_SetParameters(&filt3, 1.0f, 1.0f, 1.0f);

	  if (HAL_I2SEx_TransmitReceive_DMA(&hi2s3, (uint16_t *) dacData, (uint16_t *) adcData, BUFFER_SIZE) != HAL_OK) {
		UART_Printf("I2S Full-Duplex DMA initialization failed\n");
		Error_Handler();
	  }

	  if (HAL_UART_Receive_DMA(&huart2, uartData, sizeof(uartData)) != HAL_OK) {
		UART_Printf("UART DMA Receive initialization failed\n");
		Error_Handler();
	  }

//	  if (HAL_UART_Transmit_DMA(&huart3, (uint8_t *)uartBuffer, sizeof(uartBuffer)) != HAL_OK) {
//	    UART_Printf("UART DMA Transmit initialization failed\n");
//		Error_Handler();
//	  }

  /* USER CODE END 2 */

  /* Init scheduler */
  osKernelInitialize();

  /* USER CODE BEGIN RTOS_MUTEX */
	  /* add mutexes, ... */
  /* USER CODE END RTOS_MUTEX */

  /* Create the semaphores(s) */
  /* creation of i2sHalfFull */
  i2sHalfFullHandle = osSemaphoreNew(1, 1, &i2sHalfFull_attributes);

  /* creation of i2sFull */
  i2sFullHandle = osSemaphoreNew(1, 1, &i2sFull_attributes);

  /* creation of uartFull */
  uartFullHandle = osSemaphoreNew(1, 1, &uartFull_attributes);

  /* USER CODE BEGIN RTOS_SEMAPHORES */
	  /* add semaphores, ... */
	  //osSemaphoreAcquire(uartFullHandle, 0);
	  //osSemaphoreAcquire(i2sHalfFullHandle, 0);
	  //osSemaphoreAcquire(i2sFullHandle, 0);
  /* USER CODE END RTOS_SEMAPHORES */

  /* USER CODE BEGIN RTOS_TIMERS */
	  /* start timers, add new ones, ... */
  /* USER CODE END RTOS_TIMERS */

  /* Create the queue(s) */
  /* creation of uartQueue */
  uartQueueHandle = osMessageQueueNew (16, sizeof(uint16_t), &uartQueue_attributes);

  /* USER CODE BEGIN RTOS_QUEUES */
	  /* add queues, ... */
  /* USER CODE END RTOS_QUEUES */

  /* Create the thread(s) */
  /* creation of filterTask */
  filterTaskHandle = osThreadNew(setFilterTask, NULL, &filterTask_attributes);

  /* creation of processData */
  processDataHandle = osThreadNew(processDataTask, NULL, &processData_attributes);

  /* USER CODE BEGIN RTOS_THREADS */
	  /* add threads, ... */
  /* USER CODE END RTOS_THREADS */

  /* USER CODE BEGIN RTOS_EVENTS */
	  /* add events, ... */
  /* USER CODE END RTOS_EVENTS */

  /* Start scheduler */
  osKernelStart();
  /* We should never get here as control is now taken by the scheduler */
  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
	  while (1)
	  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
	  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Supply configuration update enable
  */
  HAL_PWREx_ConfigSupply(PWR_DIRECT_SMPS_SUPPLY);

  /** Configure the main internal regulator output voltage
  */
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

  while(!__HAL_PWR_GET_FLAG(PWR_FLAG_VOSRDY)) {}

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_CSI|RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_BYPASS;
  RCC_OscInitStruct.CSIState = RCC_CSI_ON;
  RCC_OscInitStruct.CSICalibrationValue = RCC_CSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLM = 16;
  RCC_OscInitStruct.PLL.PLLN = 500;
  RCC_OscInitStruct.PLL.PLLP = 2;
  RCC_OscInitStruct.PLL.PLLQ = 2;
  RCC_OscInitStruct.PLL.PLLR = 2;
  RCC_OscInitStruct.PLL.PLLRGE = RCC_PLL1VCIRANGE_0;
  RCC_OscInitStruct.PLL.PLLVCOSEL = RCC_PLL1VCOWIDE;
  RCC_OscInitStruct.PLL.PLLFRACN = 0;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2
                              |RCC_CLOCKTYPE_D3PCLK1|RCC_CLOCKTYPE_D1PCLK1;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.SYSCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB3CLKDivider = RCC_APB3_DIV2;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_APB1_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_APB2_DIV2;
  RCC_ClkInitStruct.APB4CLKDivider = RCC_APB4_DIV2;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief Peripherals Common Clock Configuration
  * @retval None
  */
void PeriphCommonClock_Config(void)
{
  RCC_PeriphCLKInitTypeDef PeriphClkInitStruct = {0};

  /** Initializes the peripherals clock
  */
  PeriphClkInitStruct.PeriphClockSelection = RCC_PERIPHCLK_SPI3|RCC_PERIPHCLK_SPI1;
  PeriphClkInitStruct.PLL2.PLL2M = 16;
  PeriphClkInitStruct.PLL2.PLL2N = 128;
  PeriphClkInitStruct.PLL2.PLL2P = 8;
  PeriphClkInitStruct.PLL2.PLL2Q = 8;
  PeriphClkInitStruct.PLL2.PLL2R = 2;
  PeriphClkInitStruct.PLL2.PLL2RGE = RCC_PLL2VCIRANGE_0;
  PeriphClkInitStruct.PLL2.PLL2VCOSEL = RCC_PLL2VCOWIDE;
  PeriphClkInitStruct.PLL2.PLL2FRACN = 0;
  PeriphClkInitStruct.Spi123ClockSelection = RCC_SPI123CLKSOURCE_PLL2;
  if (HAL_RCCEx_PeriphCLKConfig(&PeriphClkInitStruct) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief I2S1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_I2S1_Init(void)
{

  /* USER CODE BEGIN I2S1_Init 0 */

  /* USER CODE END I2S1_Init 0 */

  /* USER CODE BEGIN I2S1_Init 1 */

  /* USER CODE END I2S1_Init 1 */
  hi2s1.Instance = SPI1;
  hi2s1.Init.Mode = I2S_MODE_SLAVE_RX;
  hi2s1.Init.Standard = I2S_STANDARD_PHILIPS;
  hi2s1.Init.DataFormat = I2S_DATAFORMAT_16B;
  hi2s1.Init.MCLKOutput = I2S_MCLKOUTPUT_DISABLE;
  hi2s1.Init.AudioFreq = I2S_AUDIOFREQ_8K;
  hi2s1.Init.CPOL = I2S_CPOL_LOW;
  hi2s1.Init.FirstBit = I2S_FIRSTBIT_MSB;
  hi2s1.Init.WSInversion = I2S_WS_INVERSION_DISABLE;
  hi2s1.Init.Data24BitAlignment = I2S_DATA_24BIT_ALIGNMENT_RIGHT;
  hi2s1.Init.MasterKeepIOState = I2S_MASTER_KEEP_IO_STATE_DISABLE;
  if (HAL_I2S_Init(&hi2s1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN I2S1_Init 2 */

  /* USER CODE END I2S1_Init 2 */

}

/**
  * @brief I2S3 Initialization Function
  * @param None
  * @retval None
  */
static void MX_I2S3_Init(void)
{

  /* USER CODE BEGIN I2S3_Init 0 */

  /* USER CODE END I2S3_Init 0 */

  /* USER CODE BEGIN I2S3_Init 1 */

  /* USER CODE END I2S3_Init 1 */
  hi2s3.Instance = SPI3;
  hi2s3.Init.Mode = I2S_MODE_MASTER_FULLDUPLEX;
  hi2s3.Init.Standard = I2S_STANDARD_PHILIPS;
  hi2s3.Init.DataFormat = I2S_DATAFORMAT_16B_EXTENDED;
  hi2s3.Init.MCLKOutput = I2S_MCLKOUTPUT_ENABLE;
  hi2s3.Init.AudioFreq = I2S_AUDIOFREQ_48K;
  hi2s3.Init.CPOL = I2S_CPOL_LOW;
  hi2s3.Init.FirstBit = I2S_FIRSTBIT_MSB;
  hi2s3.Init.WSInversion = I2S_WS_INVERSION_DISABLE;
  hi2s3.Init.Data24BitAlignment = I2S_DATA_24BIT_ALIGNMENT_RIGHT;
  hi2s3.Init.MasterKeepIOState = I2S_MASTER_KEEP_IO_STATE_DISABLE;
  if (HAL_I2S_Init(&hi2s3) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN I2S3_Init 2 */

  /* USER CODE END I2S3_Init 2 */

}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 115200;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  huart2.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
  huart2.Init.ClockPrescaler = UART_PRESCALER_DIV1;
  huart2.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetTxFifoThreshold(&huart2, UART_TXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetRxFifoThreshold(&huart2, UART_RXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_DisableFifoMode(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief USART3 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART3_UART_Init(void)
{

  /* USER CODE BEGIN USART3_Init 0 */

  /* USER CODE END USART3_Init 0 */

  /* USER CODE BEGIN USART3_Init 1 */

  /* USER CODE END USART3_Init 1 */
  huart3.Instance = USART3;
  huart3.Init.BaudRate = 115200;
  huart3.Init.WordLength = UART_WORDLENGTH_8B;
  huart3.Init.StopBits = UART_STOPBITS_1;
  huart3.Init.Parity = UART_PARITY_NONE;
  huart3.Init.Mode = UART_MODE_TX_RX;
  huart3.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart3.Init.OverSampling = UART_OVERSAMPLING_16;
  huart3.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
  huart3.Init.ClockPrescaler = UART_PRESCALER_DIV1;
  huart3.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
  if (HAL_UART_Init(&huart3) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetTxFifoThreshold(&huart3, UART_TXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_SetRxFifoThreshold(&huart3, UART_RXFIFO_THRESHOLD_1_8) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_UARTEx_DisableFifoMode(&huart3) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART3_Init 2 */

  /* USER CODE END USART3_Init 2 */

}

/**
  * Enable DMA controller clock
  */
static void MX_DMA_Init(void)
{

  /* DMA controller clock enable */
  __HAL_RCC_DMA1_CLK_ENABLE();
  __HAL_RCC_DMA2_CLK_ENABLE();

  /* DMA interrupt init */
  /* DMA1_Stream0_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA1_Stream0_IRQn, 5, 0);
  HAL_NVIC_EnableIRQ(DMA1_Stream0_IRQn);
  /* DMA1_Stream1_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA1_Stream1_IRQn, 5, 0);
  HAL_NVIC_EnableIRQ(DMA1_Stream1_IRQn);
  /* DMA1_Stream4_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA1_Stream4_IRQn, 5, 0);
  HAL_NVIC_EnableIRQ(DMA1_Stream4_IRQn);
  /* DMA1_Stream5_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA1_Stream5_IRQn, 5, 0);
  HAL_NVIC_EnableIRQ(DMA1_Stream5_IRQn);
  /* DMA2_Stream6_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA2_Stream6_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(DMA2_Stream6_IRQn);
  /* DMA2_Stream7_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(DMA2_Stream7_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(DMA2_Stream7_IRQn);

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
/* USER CODE BEGIN MX_GPIO_Init_1 */
/* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOD_CLK_ENABLE();
  __HAL_RCC_GPIOC_CLK_ENABLE();

/* USER CODE BEGIN MX_GPIO_Init_2 */
/* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */
	void UART_Printf(const char* fmt, ...) {
	  char buff[256];
	  va_list args;
	  va_start(args, fmt);
	  vsnprintf(buff, sizeof(buff), fmt, args);
	  HAL_UART_Transmit(&huart3, (uint8_t*)buff, strlen(buff), HAL_MAX_DELAY);
	  va_end(args);
	}


	void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart) {
		UART_Printf("callback");
		HAL_UART_Transmit(&huart3, (uint8_t*)uartData, sizeof(uartData), HAL_MAX_DELAY);
		if (uartData[0] == 'f') {
		  FilterParams newParams = {0.0f, 0.0f, 0.0f};
		  uint8_t channel = 0, filter = 0, freq = 0;

		  sscanf(uartData, "%c,%d,%d,%d,%f,%f", NULL, &channel, &filter, &newParams.centerFrequency, &newParams.gain, &newParams.qFactor);
		  //sscanf(uartData, "%c,%f,%f,%f", NULL, &newParams.centerFrequency, &newParams.qFactor, &newParams.gain);

		  newParams.gain = powf(10.0f, newParams.gain / 20.0f);
		  char printBuffer[64];
		  snprintf(printBuffer, sizeof(printBuffer), "CH: %d\n\r#F: %d\n\rCF: %d \n\rQ: %.5f \n\rGain: %.5f \n\r", channel, filter, newParams.centerFrequency, newParams.qFactor, newParams.gain);

		  // f, #CH, #FILTRO, FREQ, GAIN, Q

		  IFX_PeakingFilter_SetParameters(&filt1, newParams.centerFrequency, newParams.qFactor, newParams.gain);

		  HAL_UART_Transmit(&huart3, (uint8_t*)printBuffer, strlen(printBuffer), HAL_MAX_DELAY);

		} else if (uartData[0] == 'v') {
		  uint8_t volume = 0, channel = 0;
		  sscanf(uartData, "%c,%d,%d", NULL, &channel, &volume);

		  float normalizedVolume = volume / 100.0f;
		  float volumeMultiplier = powf(10.0f, (normalizedVolume - 1.0f) * 20.0f / 10.0f);

		  char printBuffer[64];
		  snprintf(printBuffer, sizeof(printBuffer), "CH: %d \n\rV: %d \n\r", channel, volumeMultiplier);
		  HAL_UART_Transmit(&huart3, (uint8_t*)printBuffer, strlen(printBuffer), HAL_MAX_DELAY);


		  if (channel == 0) {
			  vch1 = volumeMultiplier;
		  } else if (channel == 1) {
			  vch2 = volumeMultiplier;
		  }


		}
		HAL_UART_Receive_DMA(&huart2, uartData, sizeof(uartData));
	}

	void HAL_I2SEx_TxRxHalfCpltCallback(I2S_HandleTypeDef *hi2s) {
	  inBufPtr = &adcData[0];
	  outBufPtr = &dacData[0];
	  memcpy(uartBuffer, dacData, sizeof(dacData));

	  if(osSemaphoreRelease(i2sHalfFullHandle) == osOK) {
		//UART_Printf("i2s half released..");
	  } else {
		//UART_Printf("i2s failed..");
	  }
	  dataReadyFlag = 1;
	}

	void HAL_I2SEx_TxRxCpltCallback(I2S_HandleTypeDef *hi2s) {
	  inBufPtr = &adcData[BUFFER_SIZE];
	  outBufPtr = &dacData[BUFFER_SIZE];
	  memcpy(uartBuffer, dacData, sizeof(dacData));

	  if(osSemaphoreRelease(i2sHalfFullHandle) == osOK) {
		//UART_Printf("i2s full released..");
	  } else {
		//UART_Printf("i2s failed..");
	  }
	  dataReadyFlag = 1;
	}

	void processData() {
	  static float leftIn, leftProcessed, leftProcessed2, leftOut;
	  static float rightIn, rightProcessed, rightProcessed2, rightOut;

	  for (uint8_t n = 0; n < (BUFFER_SIZE) - 1; n+=4) {
		// LEFT

		//  CONVERTIR ENTRADA ADC A FLOAT
		leftIn = INT16_TO_FLOAT(inBufPtr[n]);
		if (leftIn > 1.0f) {
		  leftIn -= 2.0f;
		}

		leftProcessed = IFX_PeakingFilter_Update(&filt1, leftIn);

		//leftProcessed2 = IFX_PeakingFilter_Update(&filt2, leftProcessed);

		//leftProcessed2 = IFX_PeakingFilter_Update(&filt3, leftProcessed2);

		// OUTPUT LEFT
		leftOut = leftProcessed * vch1;

		// CONVERTIR SALIDA DAC A SIGNED INT
		outBufPtr[n] = (int16_t) (FLOAT_TO_INT16(leftOut));
		outBufPtr[n+1] = 0;//(int16_t) (FLOAT_TO_INT16(leftOut));
		// RIGHT

		//  CONVERTIR ENTRADA ADC A FLOAT
		rightIn = INT16_TO_FLOAT(inBufPtr[n+2]);
		if (rightIn > 1.0f) {
		  rightIn -= 2.0f;
		}

		rightProcessed = IFX_PeakingFilter_Update(&filt1, rightIn);

		//rightProcessed2 = IFX_PeakingFilter_Update(&filt2, rightProcessed);

		//rightProcessed2 = IFX_PeakingFilter_Update(&filt3, rightProcessed2);

		// OUTPUT RIGHT
		rightOut = rightProcessed * vch2;

		// CONVERTIR SALIDA DAC A SIGNED INT
		outBufPtr[n+2] = (int16_t) (FLOAT_TO_INT16(rightOut));
		outBufPtr[n+3] = 0;
	  }

		dataReadyFlag = 0;
	}
/* USER CODE END 4 */

/* USER CODE BEGIN Header_setFilterTask */
	/**
	  * @brief  Function implementing the filterTask thread.
	  * @param  argument: Not used
	  * @retval None
	  */
/* USER CODE END Header_setFilterTask */
void setFilterTask(void *argument)
{
  /* USER CODE BEGIN 5 */
	  /* Infinite loop */
	  for(;;)
	  {

		osThreadYield();
		//IFX_PeakingFilter_SetParameters(&filt1, 1000.0f, hz, 0.0f);
	  }
  /* USER CODE END 5 */
}

/* USER CODE BEGIN Header_processDataTask */
	/**
	* @brief Function implementing the processData thread.
	* @param argument: Not used
	* @retval None
	*/
/* USER CODE END Header_processDataTask */
void processDataTask(void *argument)
{
  /* USER CODE BEGIN processDataTask */
	  /* Infinite loop */
	  for(;;)
	  {
		if (osSemaphoreAcquire(i2sHalfFullHandle, 0) == osOK) {
		  processData();
		}

		if (osSemaphoreAcquire(i2sHalfFullHandle, 0) == osOK) {
		  processData();
		}


//		if (osSemaphoreAcquire(i2sFullHandle, 0) == osOK) {
//		  processData();
//		}

		osThreadYield();

	  }
  /* USER CODE END processDataTask */
}

/* MPU Configuration */

void MPU_Config(void)
{
  MPU_Region_InitTypeDef MPU_InitStruct = {0};

  /* Disables the MPU */
  HAL_MPU_Disable();

  /** Initializes and configures the Region and the memory to be protected
  */
  MPU_InitStruct.Enable = MPU_REGION_ENABLE;
  MPU_InitStruct.Number = MPU_REGION_NUMBER0;
  MPU_InitStruct.BaseAddress = 0x30010000;
  MPU_InitStruct.Size = MPU_REGION_SIZE_64KB;
  MPU_InitStruct.SubRegionDisable = 0x0;
  MPU_InitStruct.TypeExtField = MPU_TEX_LEVEL0;
  MPU_InitStruct.AccessPermission = MPU_REGION_FULL_ACCESS;
  MPU_InitStruct.DisableExec = MPU_INSTRUCTION_ACCESS_DISABLE;
  MPU_InitStruct.IsShareable = MPU_ACCESS_NOT_SHAREABLE;
  MPU_InitStruct.IsCacheable = MPU_ACCESS_NOT_CACHEABLE;
  MPU_InitStruct.IsBufferable = MPU_ACCESS_BUFFERABLE;

  HAL_MPU_ConfigRegion(&MPU_InitStruct);
  /* Enables the MPU */
  HAL_MPU_Enable(MPU_PRIVILEGED_DEFAULT);

}

/**
  * @brief  Period elapsed callback in non blocking mode
  * @note   This function is called  when TIM1 interrupt took place, inside
  * HAL_TIM_IRQHandler(). It makes a direct call to HAL_IncTick() to increment
  * a global variable "uwTick" used as application time base.
  * @param  htim : TIM handle
  * @retval None
  */
void HAL_TIM_PeriodElapsedCallback(TIM_HandleTypeDef *htim)
{
  /* USER CODE BEGIN Callback 0 */

  /* USER CODE END Callback 0 */
  if (htim->Instance == TIM1) {
    HAL_IncTick();
  }
  /* USER CODE BEGIN Callback 1 */

  /* USER CODE END Callback 1 */
}

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
	  /* User can add his own implementation to report the HAL error return state */
	  __disable_irq();
	  while (1)
	  {
	  }
  /* USER CODE END Error_Handler_Debug */
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
	  /* User can add his own implementation to report the file name and line number,
		 ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */

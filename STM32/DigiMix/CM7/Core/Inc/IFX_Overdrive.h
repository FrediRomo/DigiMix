/*
 * IFX_Overdrive.h
 *
 *  Created on: Nov 11, 2024
 *      Author: chiru
 */

#ifndef INC_IFX_OVERDRIVE_H_
#define INC_IFX_OVERDRIVE_H_


#define _USE_MATH_DEFINES

#include <stdint.h>
#include <math.h>

// input low-pass filter (fc = fs / 4) 0.25dB ripple in pass-band, 60dB attenuation at stop-band, 69 taps
// http://t-filter.engineerjs.com/

#define IFX_OVERDRIVE_LPF_INP_LENGTH 69

// coefficients of the FIR filter
extern float IFX_OD_LPF_INP_COEF[IFX_OVERDRIVE_LPF_INP_LENGTH];

typedef struct {
	// Sampling time
	float T;

	// Input low-pass filter
	float 	lpfInpBuf[IFX_OVERDRIVE_LPF_INP_LENGTH];
	uint8_t lpfInpBufIndex;
	float 	lpfInpOut;

	// Input high-pass filter
	float hpfInpBufIn[2];
	float hpfInpBufOut[2];
	float hpfInpWcT;
	float hpfInpOut;

	// Overdrive settings
	float preGain;
	float threshold;

	// Output low-pass filter
	float lpfOutBufIn[3];
	float lpfOutBufOut[3];
	float lpfOutWcT;
	float lpfOutDamp;
	float lpfOutOut;

	float out;
} IFX_Overdrive;

void IFX_Overdrive_Init(IFX_Overdrive *od, float sampleRate_Hz, float hpfCutoffFrequencyHz, float odPreGain, float lpfCutoffFrequencyHz, float lpfDamping);
void IFX_Overdrive_SetHPF(IFX_Overdrive *od, float hpfCutoffFrequencyHz);
void IFX_Overdrive_SetLPF(IFX_Overdrive *od, float lpfCutoffFrequencyHz, float lpfDamping);
float IFX_Overdrive_Update(IFX_Overdrive *od, float inp);

#endif /* INC_IFX_OVERDRIVE_H_ */

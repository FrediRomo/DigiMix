/*
 * IFX_Overdrive.c
 *
 *  Created on: Nov 11, 2024
 *      Author: chiru
 */


#include "IFX_Overdrive.h"

float IFX_OD_LPF_INP_COEF[IFX_OVERDRIVE_LPF_INP_LENGTH] = {

};

void IFX_Overdrive_Init(IFX_Overdrive *od, float sampleRate_Hz, float hpfCutoffFrequencyHz, float odPreGain, float lpfCutoffFrequencyHz, float lpfDamping) {

	// Sampling time
	od->T = 1.0f / sampleRate_Hz;

	// Input high-pass filter
	od->hpfInpBufIn[0] = 0.0f;
	od->hpfInpBufIn[1] = 0.0f;

	od->hpfInpBufOut[0] = 0.0f;
	od->hpfInpBufOut[1] = 0.0f;

	od->hpfInpWcT = 2.0f * M_PI * hpfCutoffFrequencyHz * od->T;

	od->hpfInpOut = 0.0f;

	// Input low-pass filter
	for(uint8_t n = 0; n < IFX_OVERDRIVE_LPF_INP_LENGTH; n++) {
		od->lpfInpBuf[n] = 0.0f;
	}
	od->lpfInpBufIndex = 0;
	od->lpfInpOut = 0.0f;

	// Overdrive settings
	od->preGain = odPreGain;
	od->threshold = 1.0f / 3.0f;

	// Output low-pass filter
	od->lpfOutWcT = 2.0f * M_PI * lpfCutoffFrequencyHz * od->T;
	od->lpfOutDamp = lpfDamping;

}

void IFX_Overdrive_SetHPF(IFX_Overdrive *od, float hpfCutoffFrequencyHz) {
	//od->hpfInpWcT = 2.0f * M_PI * hpfCu toffFrequencyHz * od->T;
}

void IFX_Overdrive_SetLPF(IFX_Overdrive *od, float lpfCutoffFrequencyHz, float lpfDamping) {
	od->lpfOutWcT = 2.0f * M_PI * lpfCutoffFrequencyHz * od->T;
	od->lpfOutDamp = lpfDamping;
}

float IFX_Overdrive_Update(IFX_Overdrive *od, float inp) {
	// FIR low-pass anti-aliasing filter
	od->lpfInpBuf[od->lpfInpBufIndex] = inp;
	od->lpfInpBufIndex++;

	if(od->lpfInpBufIndex == IFX_OVERDRIVE_LPF_INP_LENGTH) {
		od->lpfInpBufIndex = 0;
	}

	od->lpfInpOut = 0.0f;
	uint8_t index = od->lpfInpBufIndex;

	for(uint8_t n = 0; n < IFX_OVERDRIVE_LPF_INP_LENGTH; n++) {
		if(index == 0) {
			index = IFX_OVERDRIVE_LPF_INP_LENGTH - 1;
		} else {
			index--;
		}

		od->lpfInpOut += IFX_OD_LPF_INP_COEF[n] * od->lpfInpBuf[index];
	}

	// Variable first order IIR High-pass filter to remove some low frequency components, as these sound muddy when distorted
	od->hpfInpBufIn[1] = od->hpfInpBufIn[0];
	od->hpfInpBufIn[0] = od->lpfInpOut;

	od->hpfInpBufOut[1] = od->hpfInpBufOut[0];
	od->hpfInpBufOut[0] = (2.0f * (od->hpfInpBufIn[0] - od->hpfInpBufIn[1]) + (2.0f - od->hpfInpWcT) * od->hpfInpBufOut[0]);




}






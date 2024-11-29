/*
 * IFX_PeakingFilter.c
 *
 *  Created on: Oct 15, 2024
 *      Author: chiru
 */


#include "IFX_PeakingFilter.h"

// Initialize
void IFX_PeakingFilter_Init(IFX_PeakingFilter *filt, float sampleRate_Hz) {

	// Sample time
	filt->sampleTime_s = 1.0f / sampleRate_Hz;

	// Clear mem
	for(uint8_t n = 0; n < 3; n++) {
		filt->x[n] = 0.0f;
		filt->y[n] = 0.0f;
	}

	// Calculate all-pass filter
	IFX_PeakingFilter_SetParameters(filt, 1.0f, 1.0f, 1.0f);
}

// Compute filter coefficients. (	 > 1.0f = boost | boostCut_linear < 1.0f = cut)
void IFX_PeakingFilter_SetParameters(IFX_PeakingFilter *filt, float centerFrequency_Hz, float Q, float boostCut_linear) {

	// Convert Hz to rad/s, pre-warp cut off frequency, multiply by sampling time (wc*T = ...)
	float wcT = 2.0f * tanf(M_PI * centerFrequency_Hz * filt->sampleTime_s);
	float wcT2 = wcT * wcT;
	// Compute quality factor (Q = f(Center) / f(bandwidth))
	float invQ = 1.0f / Q;

	// Compute filter coefficients
	filt->a[0] = 4.0f + 2.0f * (boostCut_linear * invQ) * wcT + wcT2;
	filt->a[1] = 2.0f * wcT2 - 8.0f;
	filt->a[2] = 4.0f - 2.0f * (boostCut_linear * invQ) * wcT + wcT2;

	filt->b[0] = 1.0f / (4.0f + 2.0f * invQ * wcT + wcT2);	// 1 / coefficient
	filt->b[1] = -(2.0f * wcT2 - 8.0f);					// -coefficient
	filt->b[2] = -(4.0f - 2.0f * invQ * wcT + wcT2);			// -coefficient

}

float IFX_PeakingFilter_Update(IFX_PeakingFilter *filt, float in) {

	// Shift samples
	filt->x[2] = filt->x[1];
	filt->x[1] = filt->x[0];
	filt->x[0] = in;

	filt->y[2] = filt->y[1];
	filt->y[1] = filt->y[0];

	// Compute new filter output
	filt->y[0] = (filt->a[0] * filt->x[0] + filt->a[1] * filt->x[1] + filt->a[2] * filt->x[2]
			+    (filt->b[1] * filt->y[1] + filt->b[2] * filt->y[2])) * filt->b[0];

	// Return current output sample
	return(filt->y[0]);

}

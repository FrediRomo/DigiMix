#ifndef INC_IFX_PeakingFilter_H
#define INC_IFX_PeakingFilter_H

#include <math.h>
#include <stdint.h>

typedef struct {

	// Sample Time
	float sampleTime_s;

	// Filter inputs (x[0] = current input sample)
	float x[3];

	// Filter outputs (y[0] = current filtered output sample)
	float y[3];

	// x[n] coefficients
	float a[3];

	// y[n] coefficients
	float b[3];

} IFX_PeakingFilter;

void IFX_PeakingFilter_Init(IFX_PeakingFilter *filt, float sampleRate_Hz);
void IFX_PeakingFilter_SetParameters(IFX_PeakingFilter *filt, float centerFrequency_Hz, float bandwidth_Hz, float boostCut_linear);
float IFX_PeakingFilter_Update(IFX_PeakingFilter *filt, float in);

#endif

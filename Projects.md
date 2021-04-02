---
layout: page
title: Research
subtitle: Projects and talks
show-avatar: false
---

My research interests span over VLSI design, image processing, information theory, and wireless communication. Some of my prior work related to them are listed below

## [Optimal synthesis of fixed-point FIR filters](https://vignesh99.github.io/Research/FIRfilterTI)

<hr style="border:2px solid gray"> 

### Image Segmentation
As a part of the [Image Signal processing](https://github.com/vignesh99/ImageSignalProcessing-EE5175) course project I reproduced the paper "Normalized Cuts
and Image Segmentation" by _Jianbo Shi_ and _Jitendra Malik_. The normalized cut algorithm employs optimization via Rayleigh's inequality, and was found to be effective on images with distinct partitions. The algorithm's dependency on the hyperparameters has been explained in the [report](https://github.com/vignesh99/Image-Segmentation/blob/master/EE5175_Project_EE16B127.pdf). The sparsity in the graph has been exploited and the [code](https://github.com/vignesh99/Image-Segmentation) was implemented without any explicit loops; thus decreasing the run time significantly.

<hr style="border:2px solid gray"> 

### Talk on MIMO transceiver optimization
I gave a talk on transceiver optimization for THP (Tomlinson-Harashima Precoded) MIMO systems as a part of the course Multi-Antenna Digital Communications. The talk revolved around understanding multiplicative Schur convex objective functions and how the implications of the work can be understood using already known concepts. Here are the [slides](https://github.com/vignesh99/Transceiver-Optimization-MIMO-systems/blob/master/Presentation.pdf) from the talk and the [paper](https://ieeexplore.ieee.org/document/4567648) by _Alberto D’Amico_ that was expounded.  
<hr style="border:2px solid gray"> 

### Spoken Digit Recognition via HMM and ANN
The HMM-based recognition involved grouping the [MFCC](https://en.wikipedia.org/wiki/Mel-frequency_cepstrum#:~:text=Mel%2Dfrequency%20cepstral%20coefficients%20(MFCCs,%2Da%2Dspectrum%22)) features of isolated-digit utterances using K-means clustering. The HMM models obtained for the isolated-digits using training data was concatenated, to predict the continous speech utterances. When implementing the ANN-based recognition the MFCC features were passed through an Auto-Encoder and the hidden layer representation was used to train the deep neural network. The [report](https://github.com/vignesh99/SpeechTechnology-CS6300/blob/master/Mini%20Project%202/Mini%20Project%202%20HMMs.pdf) and [code](https://github.com/vignesh99/SpeechTechnology-CS6300/blob/master/HMMs.ipynb) can be looked into for further details. 

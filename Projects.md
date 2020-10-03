---
layout: page
title: Research
subtitle: Projects and talks
show-avatar: false
---

Some of my prior work related to them are listed below

### Optimal synthesis of fixed-point FIR filters
As a part of my summer internship at _Texas Instruments_ I worked on designing FIR (Finite Impulse Response) filter coefficients to reduce power consumption. Given the bandwidth and ripple specifications, the problem was formulated as a MILP (**Mixed-Integer Linear Programming**) problem, where optimization was done over the gain (continuous) and filter coefficients (fixed-point/integer). By reducing the number of bits in the filter-coefficient representation the number of partial products of the multiplier reduces, thus reducing the hardware expense. I also designed a heuristic Multi-pass MILP (optimization is performed over several passes) which is faster but less optimal compared to the MILP approach.

<hr style="border:2px solid gray"> 

### Image Segmentation
As a part of the [Image Signal processing](https://github.com/vignesh99/ImageSignalProcessing-EE5175) course project I reproduced the paper "Normalized Cuts
and Image Segmentation" by _Jianbo Shi_ and _Jitendra Malik_. The Normalized Cut algorithm employs optimization via Rayleigh's inequality, and was found to be effective on images with distinct partitions. The algorithm's dependency on the hyperparameters has been explained in the [report](https://github.com/vignesh99/Image-Segmentation/blob/master/EE5175_Project_EE16B127.pdf). The sparsity in the graph has been exploited and the [code](https://github.com/vignesh99/Image-Segmentation) is implemented without any explicit loops; thus decreasing the run time significantly.

<hr style="border:2px solid gray"> 

### Talk on MIMO Transceiver Optimization
I gave a talk on Transceiver optimization for THP (Tomlinson-Harashima Precoded) MIMO systems as a part of the course Multi-Antenna Digital Communications. The talk revolved around understanding Multiplicative Schur convex objective functions and how the implications of the work can be understood using already known concepts. Here are the [slides](https://github.com/vignesh99/Transceiver-Optimization-MIMO-systems/blob/master/Presentation.pdf) and the [paper](https://ieeexplore.ieee.org/document/4567648) by _Alberto D’Amico_ which was expounded. 

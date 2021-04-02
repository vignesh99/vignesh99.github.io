---
layout: page
title: Research
subtitle: Optimal synthesis of fixed-point FIR filters
show-avatar: false
---
As a part of my summer internship at _Texas Instruments_ I worked on designing FIR (Finite Impulse Response) filter coefficients to reduce power consumption. Given the bandwidth and ripple specifications, the problem was formulated as a mixed-integer linear programming problem (MILP), where optimization was done over the gain (continuous) and filter coefficients (fixed-point/integer). By reducing the number of bits in the filter-coefficient representation the number of partial products of the multiplier reduces, thus reducing the hardware expense. I also designed a heuristic multi-pass MILP (optimization is performed over several passes) which is faster but less optimal compared to the MILP approach. The slides from the talk can be found [here](https://drive.google.com/file/d/1KmIV042MtBcKLTNqkHNfUv1x97a4MTur/view?usp=sharing).

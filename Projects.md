---
layout: page
title: Research
subtitle: Projects and talks
---

Some of my prior work related to them are listed below

### Optimal synthesis of fixed-point FIR filters
As a part of my summer internship at _Texas Instruments_ I worked on designing FIR (Finite Impulse Response) filter coefficients to reduce power consumption. Given the bandwidth and ripple specifications, the problem was formulated as a MILP (**Mixed-Integer Linear Programming**) problem, where optimization was done over the gain (continuous) and filter coefficients (fixed-point/integer). By reducing the number of bits in the filter-coefficient representation the number of partial products of the multiplier reduces, thus reducing the hardware expense. This proposed method outperformed the existing method by reducing the power by an additional 20%. I also designed a heuristic Multi-pass MILP (optimization is performed over several passes) which is faster but less optimal compared to the MILP approach.

---

### Image Segmentation

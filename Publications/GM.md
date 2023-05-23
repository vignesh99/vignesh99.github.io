---
layout: page
title: Glitch reduction using GP
subtitle: TCAD
show-avatar: false
---

# Geometric Programming Approach to Glitch Minimization via Gate Sizing
Karthikeyan Muthamizh Vithagan, **Vignesh Sundaresha**, Janakiraman Viraraghavan  
[PDF](https://ieeexplore.ieee.org/document/9896135) | [Bibtex](#citation)

### Abstract
The problem of gate sizing to meet timing specification while minimizing functional power/area is well understood and is solved by the use of geometric programs (GPs). While these area minimization GP (AM-GP) formulations minimize functional power, they do not address the problem of glitches. Glitches are extraneous transitions caused by signal arrival time imbalance at the input nodes of logic gates. A gate sizing algorithm, Area-Glitch minimization GP (AGM-GP), is proposed to reduce glitches while constraining area and adhering to a timing specification. Glitch reduction is achieved through signal arrival time balancing posed as posynomials in a GP formulation. Prior art does not exploit the complete power of gate sizing when reducing glitches in an attempt to meet the timing specification. In particular, the proposed formulation allows both upsizing and downsizing without causing any timing violation, at the expense of a marginal increase in area. Traditional downsizing methods can be used to further reduce glitches over and above the AGM-GP solution. Simulation results on the ISCAS-85 benchmark circuits show an overall reduction of 20.4% glitch power and 9.5% total power which is respectively 13.8% and 3.9% better than just downsizing the AM-GP solution. This power reduction was achieved with an average area increase of 4.2%.
### Citation
<pre><code>@ARTICLE{9896135,
  author={Vithagan, Karthikeyan Muthamizh and Sundaresha, Vignesh and Viraraghavan, Janakiraman},
  journal={IEEE Transactions on Computer-Aided Design of Integrated Circuits and Systems}, 
  title={Geometric Programming Approach to Glitch Minimization via Gate Sizing}, 
  year={2022},
  volume={},
  number={},
  pages={1-1},
  doi={10.1109/TCAD.2022.3207970}}
</code></pre>

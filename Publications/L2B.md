---
layout: page
title: Localize to Binauralize
subtitle: ICCV 2021
show-avatar: false
---

# Localize to Binauralize: Audio Spatialization from Visual Sound Source Localization
Kranthi Kumar Rachavarapu, Aakanksha, **Vignesh Sundaresha**, A. N. Rajagopalan  
[PDF](https://openaccess.thecvf.com/content/ICCV2021/html/Rachavarapu_Localize_to_Binauralize_Audio_Spatialization_From_Visual_Sound_Source_Localization_ICCV_2021_paper.html) | [GitHub](https://github.com/KranthiKumarR/Localize-to-Binauralize) | [Bibtex](#citation)

### Abstract
Videos with binaural audios provide an immersive viewing experience by enabling 3D sound sensation. Recent works attempt to generate binaural audio in a multimodal learning framework using large quantities of videos with accompanying binaural audio. In contrast, we attempt a more challenging problem -- synthesizing binaural audios for a video with monaural audio in a weakly supervised setting and weakly semi-supervised setting. Our key idea is that any down-stream task that can be solved only using binaural audios can be used to provide proxy supervision for binaural audio generation, thereby reducing the reliance on explicit supervision. In this work, as a proxy-task for weak supervision, we use Sound Source Localization with only audio. We design a two-stage architecture called Localize-to-Binauralize Network (L2BNet). The first stage of L2BNet is a Stereo Generation (SG) network employed to generate two-stream audio from monaural audio using visual frame information as guidance. In the second stage, an Audio Localization (AL) network is designed to use the synthesized two-stream audio to localize sound sources in visual frames. The entire network is trained end-to-end so that the AL network provides necessary supervision for the SG network. We experimentally show that our weakly-supervised framework generates two-stream audio containing binaural cues. Through user study, we further validate that our proposed approach generates binaural-quality audio using as little as 10% of explicit binaural supervision data for the SG network.

### Citation
<pre><code>@InProceedings{Rachavarapu_2021_ICCV,
    author    = {Rachavarapu, Kranthi Kumar and Aakanksha and Sundaresha, Vignesh and Rajagopalan, A. N.},
    title     = {Localize to Binauralize: Audio Spatialization From Visual Sound Source Localization},
    booktitle = {Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)},
    month     = {October},
    year      = {2021},
    pages     = {1930-1939}
}
</code></pre>

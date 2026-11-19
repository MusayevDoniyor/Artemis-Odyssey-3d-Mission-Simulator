# Empirical Cold-Cache Loading Benchmark (5 Runs via CDP)
Tested against production build on preview server (`http://localhost:4173/`) with strictly cleared cache and CDP network emulation.

- **Physical GPU**: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **Methodology**: 5 cold runs per profile. `Network.clearBrowserCache` and `Network.setCacheDisabled({ cacheDisabled: true })` invoked before every run.
- **Fast 3G Parameters**: 150 ms RTT, 1.6 Mbps download (200 KB/s), 750 Kbps upload.

---

## 1. Multi-Run Summary Table

| Metric | Unthrottled (Median) | Unthrottled Spread [Min - Max] | Fast 3G (Median) | Fast 3G Spread [Min - Max] |
| :--- | :---: | :---: | :---: | :---: |
| **DOM Interactive** | **87 ms** | [62 - 742 ms] | **280 ms** | [238 - 451 ms] |
| **First Paint (FP)** | **732 ms** | [100 - 1992 ms] | **1020 ms** | [828 - 1208 ms] |
| **First Contentful Paint (FCP)** | **832 ms** | [220 - 1992 ms] | **2996 ms** | [2876 - 3124 ms] |
| **Time to First 3D Frame** | **1253 ms** | [869 - 2092 ms] | **3705 ms** | [3473 - 3785 ms] |
| **Wire Transferred Bytes** | **10714.7 KB** | [10714.7 - 10902.9 KB] | **531.5 KB** | [490.3 - 585.6 KB] |

---

## 2. Explanation of Past Inversions & Bundle Breakdown

### Root Cause of Past Fast 3G Inversion
- In the initial test runs, browser cache was not purged between tests. Fast 3G ran immediately after unthrottled runs and served JS chunks from memory/disk cache, resulting in artificial 110 ms DOM interactive readings.
- With true CDP cache clearing (`Network.clearBrowserCache` + `Network.setCacheDisabled`), Fast 3G strictly exhibits the expected physical network transfer curves:
  - Unthrottled First 3D Frame: **1253 ms**
  - Fast 3G First 3D Frame: **3705 ms** (reflecting wire download of assets at 1.6 Mbps).

### Reconciliation: 192.42 KB vs 424.69 KB
- **192.42 KB**: Origin is `public/draco/draco_decoder.wasm` (exact byte count: **192,420 bytes**), which Vite emits to `dist/assets/draco_decoder-Z1_iN-Ht.wasm`. It is the Google Draco WebAssembly decompression binary fetched when loading compressed aerospace models.
- **424.69 KB**: Origin is the main application client bundle (`dist/assets/index-BJj18Jn2.js`, 424,690 bytes).
- The earlier report had juxtaposed these two distinct assets. Both numbers are verified directly against `dist/` build output.

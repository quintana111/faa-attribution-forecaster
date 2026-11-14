# FAA Attribution Forecast

A deterministic, offline quantile forecaster for the four Polymarket FAA attribution markets. It uses only the case's supplied minute prices, a blended recent-volatility estimate, a persistence median, and bounded Gaussian quantiles. Runtime: Node.js 22 standard library; input/output follow the competition's `program/v1` contract.

## Local run

```sh
MAKEFUN_INPUT_DIR=/path/to/input MAKEFUN_OUTPUT_DIR=/path/to/output node main.ts
```

No network calls, packages, or external data are used at runtime.

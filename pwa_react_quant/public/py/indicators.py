import numpy as np

def MA(prices, period):
    if len(prices) < period:
        return [np.nan] * len(prices)
    arr = np.array(prices)
    weights = np.ones(period) / period
    ma = np.convolve(arr, weights, mode='valid')
    # 填充前面的 NaN 保留陣列長度
    result = np.concatenate((np.full(period - 1, np.nan), ma))
    return result.tolist()

def EMA(prices, period):
    if len(prices) < period:
        return [np.nan] * len(prices)
    ema = np.full(len(prices), np.nan)
    multiplier = 2 / (period + 1)
    
    # 初始化 EMA，第一天用 SMA
    sma_first = np.mean(prices[:period])
    ema[period - 1] = sma_first
    
    for i in range(period, len(prices)):
        ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1]
        
    return ema.tolist()

def MACD(prices, fast_period=12, slow_period=26, signal_period=9):
    fast_ema = np.array(EMA(prices, fast_period))
    slow_ema = np.array(EMA(prices, slow_period))
    
    dif = fast_ema - slow_ema
    
    # DEA 就是 DIF 的 9 日 EMA
    # 注意 np.nan 會干擾，從有效資料開始計算
    valid_idx = slow_period - 1
    if valid_idx >= len(dif):
        return [np.nan]*len(prices), [np.nan]*len(prices), [np.nan]*len(prices)
        
    dea = np.full(len(prices), np.nan)
    valid_dif = dif[valid_idx:]
    if len(valid_dif) >= signal_period:
        sma_first = np.mean(valid_dif[:signal_period])
        dea_start_idx = valid_idx + signal_period - 1
        dea[dea_start_idx] = sma_first
        
        multiplier = 2 / (signal_period + 1)
        for i in range(dea_start_idx + 1, len(prices)):
            dea[i] = (dif[i] - dea[i - 1]) * multiplier + dea[i - 1]
            
    macd = (dif - dea) * 2
    return dif.tolist(), dea.tolist(), macd.tolist()

def Cross(fast_arr, slow_arr):
    """
    計算交叉
    1: 金叉 (快線上穿慢線)
    -1: 死叉 (快線下穿慢線)
    0: 無交叉
    """
    fast = np.array(fast_arr)
    slow = np.array(slow_arr)
    
    result = np.zeros(len(fast))
    
    for i in range(1, len(fast)):
        if np.isnan(fast[i]) or np.isnan(slow[i]) or np.isnan(fast[i-1]) or np.isnan(slow[i-1]):
            continue
            
        if fast[i-1] <= slow[i-1] and fast[i] > slow[i]:
            result[i] = 1 # 金叉
        elif fast[i-1] >= slow[i-1] and fast[i] < slow[i]:
            result[i] = -1 # 死叉
            
    return result.tolist()

def BOLL(prices, period=20, multiplier=2):
    if len(prices) < period:
        nan_arr = [np.nan] * len(prices)
        return nan_arr, nan_arr, nan_arr
        
    arr = np.array(prices)
    mid = MA(prices, period)
    
    up = np.full(len(prices), np.nan)
    down = np.full(len(prices), np.nan)
    
    for i in range(period - 1, len(prices)):
        window = arr[i - period + 1 : i + 1]
        std = np.std(window, ddof=0)
        up[i] = mid[i] + std * multiplier
        down[i] = mid[i] - std * multiplier
        
    return up.tolist(), mid, down.tolist()

def ATR(highs, lows, closes, period=14):
    trs = np.zeros(len(highs))
    
    for i in range(1, len(highs)):
        h, l, prev_c = highs[i], lows[i], closes[i-1]
        trs[i] = max(h - l, abs(h - prev_c), abs(l - prev_c))
        
    # 第一天的 TR 用高低差代替
    trs[0] = highs[0] - lows[0]
    
    # ATR 可以用 SMA 也可以用 RMA (Wilder's Smoothing)
    # 這裡採用常見的 RMA 方式
    atr = np.full(len(highs), np.nan)
    if len(highs) >= period:
        atr[period-1] = np.mean(trs[:period])
        for i in range(period, len(highs)):
            atr[i] = (atr[i-1] * (period - 1) + trs[i]) / period
            
    return atr.tolist()

def RSI(prices, period=14):
    if len(prices) < period: return [np.nan]*len(prices)
    arr = np.array(prices)
    deltas = np.diff(arr)
    seed = deltas[:period]
    up = seed[seed >= 0].sum() / period
    down = -seed[seed < 0].sum() / period
    rs = up / down if down != 0 else 0
    rsi = np.zeros(len(prices))
    rsi[:period] = 100. - 100. / (1. + rs)

    for i in range(period, len(prices)):
        delta = deltas[i - 1]
        if delta > 0:
            upval = delta
            downval = 0.
        else:
            upval = 0.
            downval = -delta

        up = (up * (period - 1) + upval) / period
        down = (down * (period - 1) + downval) / period
        rs = up / down if down != 0 else 0
        rsi[i] = 100. - 100. / (1. + rs)
    return rsi.tolist()

def ADX(highs, lows, closes, period=14):
    """
    Directional Movement Index (DMI) / ADX
    """
    n = len(closes)
    plus_dm = np.zeros(n)
    minus_dm = np.zeros(n)
    tr = np.zeros(n)

    for i in range(1, n):
        up_move = highs[i] - highs[i-1]
        down_move = lows[i-1] - lows[i]
        
        if up_move > down_move and up_move > 0: plus_dm[i] = up_move
        else: plus_dm[i] = 0
            
        if down_move > up_move and down_move > 0: minus_dm[i] = down_move
        else: minus_dm[i] = 0
            
        tr[i] = max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1]))
    
    tr[0] = highs[0] - lows[0]
    
    # Wilder's Smoothing
    tr_smooth = np.zeros(n)
    pdm_smooth = np.zeros(n)
    mdm_smooth = np.zeros(n)
    
    tr_smooth[period] = np.sum(tr[1:period+1])
    pdm_smooth[period] = np.sum(plus_dm[1:period+1])
    mdm_smooth[period] = np.sum(minus_dm[1:period+1])
    
    for i in range(period+1, n):
        tr_smooth[i] = tr_smooth[i-1] - (tr_smooth[i-1]/period) + tr[i]
        pdm_smooth[i] = pdm_smooth[i-1] - (pdm_smooth[i-1]/period) + plus_dm[i]
        mdm_smooth[i] = mdm_smooth[i-1] - (mdm_smooth[i-1]/period) + minus_dm[i]
        
    plus_di = 100 * pdm_smooth / tr_smooth
    minus_di = 100 * mdm_smooth / tr_smooth
    dx = 100 * np.abs(plus_di - minus_di) / (plus_di + minus_di)
    
    adx = np.zeros(n)
    adx[period*2 - 1] = np.mean(dx[period:period*2])
    for i in range(period*2, n):
        adx[i] = (adx[i-1] * (period - 1) + dx[i]) / period
        
    return adx.tolist(), plus_di.tolist(), minus_di.tolist()
def Highest(prices, period):
    if len(prices) == 0: return []
    result = np.full(len(prices), np.nan)
    arr = np.array(prices)
    for i in range(period - 1, len(prices)):
        result[i] = np.max(arr[i - period + 1 : i + 1])
    return result.tolist()

def Lowest(prices, period):
    if len(prices) == 0: return []
    result = np.full(len(prices), np.nan)
    arr = np.array(prices)
    for i in range(period - 1, len(prices)):
        result[i] = np.min(arr[i - period + 1 : i + 1])
    return result.tolist()

def AMA(prices, n=10, fast=2, slow=30):
    """
    Kaufman's Adaptive Moving Average (KAMA)
    """
    n_len = len(prices)
    if n_len < n: return [np.nan]*n_len
    
    ama = np.full(n_len, np.nan)
    arr = np.array(prices)
    
    # 效率比 (Efficiency Ratio) ER = |目前價格 - N日前價格| / 價格變動絕對值總和
    er = np.zeros(n_len)
    for i in range(n, n_len):
        abs_diff = np.abs(arr[i] - arr[i-n])
        total_abs_diff = np.sum(np.abs(np.diff(arr[i-n : i+1])))
        if total_abs_diff != 0:
            er[i] = abs_diff / total_abs_diff
            
    # 平滑常數 SC = (ER * (fastSC - slowSC) + slowSC)^2
    fsc = 2 / (fast + 1)
    ssc = 2 / (slow + 1)
    sc = (er * (fsc - ssc) + ssc) ** 2
    
    ama[n-1] = arr[n-1]
    for i in range(n, n_len):
        ama[i] = ama[i-1] + sc[i] * (arr[i] - ama[i-1])
        
    return ama.tolist()

def AROON(highs, lows, period=25):
    """
    阿隆指標 (Aroon Indicator)
    """
    n = len(highs)
    if n < period: return [np.nan]*n, [np.nan]*n
    
    aroon_up = np.zeros(n)
    aroon_down = np.zeros(n)
    
    for i in range(period, n):
        # 尋找過去 period 內之最高點距今天數
        window_h = highs[i-period : i+1]
        window_l = lows[i-period : i+1]
        
        # argmax 回傳索引，我們要的是距離
        days_since_high = period - np.argmax(window_h)
        days_since_low = period - np.argmin(window_l)
        
        aroon_up[i] = ((period - days_since_high) / period) * 100
        aroon_down[i] = ((period - days_since_low) / period) * 100
        
    return aroon_up.tolist(), aroon_down.tolist()

def EMV(highs, lows, volumes, period=14):
    """
    簡易波動指標 (Ease of Movement, EMV)
    """
    n = len(highs)
    if n < 2: return [0.0]*n
    
    # 距離移動 = (本日高低點中點 - 昨日高低點中點)
    # 箱體率 = (成交量 / 1,000,000) / (本日高點 - 本日低點)
    # 本日 EMV = 距離移動 / 箱體率
    emv_raw = np.zeros(n)
    highs = np.array(highs)
    lows = np.array(lows)
    vols = np.array(volumes)
    
    for i in range(1, n):
        mid_move = (highs[i] + lows[i])/2 - (highs[i-1] + lows[i-1])/2
        hl_diff = highs[i] - lows[i]
        
        # 避免除以零
        if hl_diff == 0:
            box_ratio = 1
        else:
            # 除以 1,000,000 是一般常規化的處理
            box_ratio = (vols[i] / 1000000) / hl_diff
            
        if box_ratio != 0:
            emv_raw[i] = mid_move / box_ratio
            
    # 對 EMV 進行 MA 平滑
    emv_ma = MA(emv_raw.tolist(), period)
    return emv_ma

def CMI(closes, period=14):
    """
    市場恆溫器指數 (Choppiness Market Index, CMI)
    """
    n = len(closes)
    if n < period: return [50.0]*n
    
    cmi = np.zeros(n)
    arr = np.array(closes)
    
    for i in range(period, n):
        # 最近 N 日收盤價淨變動
        abs_change = np.abs(arr[i] - arr[i-period])
        # 最近 N 日內波動區間 (最高 - 最低)
        high = np.max(arr[i-period : i+1])
        low = np.min(arr[i-period : i+1])
        
        diff = high - low
        if diff != 0:
            cmi[i] = (abs_change / diff) * 100
        else:
            cmi[i] = 50.0
            
    return cmi.tolist()

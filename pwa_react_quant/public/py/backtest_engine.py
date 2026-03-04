import numpy as np
import json

class BacktestEngine:
    """
    輕量級向量化回測引擎 (針對 Pyodide 設計)
    """
    def __init__(self, data, initial_capital=100000):
        # 數據轉換為 numpy 陣列加速計算
        self.raw_data = data
        self.closes = np.array([d['Close'] for d in data])
        self.dates = [d['Date'] for d in data]
        self.n = len(data)
        
        self.initial_capital = initial_capital
        self.capital = initial_capital
        self.position = 0           # 目前持倉單位數
        self.avg_price = 0.0        # 平均成本
        
        self.commission = 0.0005    # 預設手續費 0.05%
        
        # 記錄
        self.equity_curve = np.zeros(self.n)
        self.trades = []
        
    def buy(self, price, index, qty=None, reason=""):
        """
        買入。可以接受 buy(price, index, qty, reason) 或 buy(price, index, reason)
        """
        if isinstance(qty, str):
            reason = qty
            qty = None

        if qty is None:
            # 扣除手續費後的可用數量
            cost_factor = 1 + self.commission
            qty = self.capital / (price * cost_factor)
            
        total_cost = qty * price
        comm = total_cost * self.commission
        
        if total_cost + comm > self.capital + 0.01:
            qty = self.capital / (price * (1 + self.commission))
            total_cost = qty * price
            comm = total_cost * self.commission
            
        if qty <= 0: return

        new_total_qty = self.position + qty
        self.avg_price = (self.avg_price * self.position + price * qty) / (new_total_qty if new_total_qty != 0 else 1)
        self.position = new_total_qty
        self.capital -= (total_cost + comm)
        
        self.trades.append({
            "type": "BUY", "price": round(price, 2), "qty": round(qty, 4),
            "index": index, "date": self.dates[index], "reason": reason, "comm": round(comm, 2)
        })
        
    def sell(self, price, index, qty=None, reason=""):
        """
        賣出。可以接受 sell(price, index, qty, reason) 或 sell(price, index, reason)
        """
        if self.position <= 0: return

        if isinstance(qty, str):
            reason = qty
            qty = None
        
        if qty is None or qty > self.position:
            qty = self.position
            
        value = qty * price
        comm = value * self.commission
        self.capital += (value - comm)
        
        profit = (price - self.avg_price) / self.avg_price * 100 if self.avg_price != 0 else 0
        
        self.trades.append({
            "type": "SELL", "price": round(price, 2), "qty": round(qty, 4),
            "index": index, "date": self.dates[index], "reason": reason, 
            "profit_pct": round(profit, 2), "comm": round(comm, 2)
        })
        
        self.position -= qty
        if self.position <= 0:
            self.position = 0
            self.avg_price = 0
        
    def run(self, strategy_func):
        """
        執行回測
        strategy_func: def func(engine, data, index)
        """
        for i in range(self.n):
            # 記錄當前權益
            current_value = self.capital + (self.position * self.closes[i] if self.position > 0 else 0)
            self.equity_curve[i] = current_value
            
            # 執行策略邏輯
            strategy_func(self, self.raw_data, i)
            
        return self._generate_report()
        
    def _generate_report(self):
        # 處理如果最後一天還有持倉，以最後結算價計算
        final_capital = self.equity_curve[-1]
        total_return = (final_capital - self.initial_capital) / self.initial_capital * 100
        
        # 計算最大回撤
        peak = np.maximum.accumulate(self.equity_curve)
        drawdown = (peak - self.equity_curve) / peak * 100
        max_drawdown = np.max(drawdown)
        
        # 勝率
        sell_trades = [t for t in self.trades if t['type'] == 'SELL']
        win_trades = [t for t in sell_trades if t.get('profit_pct', 0) > 0]
        
        total_trades = len(sell_trades)
        win_rate = (len(win_trades) / total_trades * 100) if total_trades > 0 else 0
        
        # 簡單夏普比率 (假設無風險利率0)
        daily_returns = np.diff(self.equity_curve) / self.equity_curve[:-1]
        std = np.std(daily_returns) if len(daily_returns) > 0 else 0
        sharpe = (np.mean(daily_returns) / std * np.sqrt(252)) if std > 0 else 0
        
        return {
            "initial_capital": self.initial_capital,
            "final_capital": round(final_capital, 2),
            "total_return": round(total_return, 2),
            "max_drawdown": round(max_drawdown, 2),
            "total_trades": total_trades,
            "win_rate": round(win_rate, 2),
            "sharpe_ratio": round(sharpe, 2),
            "equity_curve": [round(x, 2) for x in self.equity_curve.tolist()],
            "dates": self.dates,
            "trades": self.trades
        }

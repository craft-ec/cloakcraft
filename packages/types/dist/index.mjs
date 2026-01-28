// src/index.ts
var PoolType = /* @__PURE__ */ ((PoolType2) => {
  PoolType2[PoolType2["ConstantProduct"] = 0] = "ConstantProduct";
  PoolType2[PoolType2["StableSwap"] = 1] = "StableSwap";
  return PoolType2;
})(PoolType || {});
var OrderStatus = /* @__PURE__ */ ((OrderStatus2) => {
  OrderStatus2[OrderStatus2["Open"] = 0] = "Open";
  OrderStatus2[OrderStatus2["Filled"] = 1] = "Filled";
  OrderStatus2[OrderStatus2["Cancelled"] = 2] = "Cancelled";
  return OrderStatus2;
})(OrderStatus || {});
var AggregationStatus = /* @__PURE__ */ ((AggregationStatus2) => {
  AggregationStatus2[AggregationStatus2["Active"] = 0] = "Active";
  AggregationStatus2[AggregationStatus2["Decrypting"] = 1] = "Decrypting";
  AggregationStatus2[AggregationStatus2["Finalized"] = 2] = "Finalized";
  return AggregationStatus2;
})(AggregationStatus || {});
var PositionStatus = /* @__PURE__ */ ((PositionStatus2) => {
  PositionStatus2[PositionStatus2["Active"] = 0] = "Active";
  PositionStatus2[PositionStatus2["Liquidated"] = 1] = "Liquidated";
  PositionStatus2[PositionStatus2["Closed"] = 2] = "Closed";
  return PositionStatus2;
})(PositionStatus || {});
export {
  AggregationStatus,
  OrderStatus,
  PoolType,
  PositionStatus
};

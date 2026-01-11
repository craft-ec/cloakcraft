// src/index.ts
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
export {
  AggregationStatus,
  OrderStatus
};

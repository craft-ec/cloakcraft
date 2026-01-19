"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AggregationStatus: () => AggregationStatus,
  OrderStatus: () => OrderStatus,
  PoolType: () => PoolType
});
module.exports = __toCommonJS(index_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AggregationStatus,
  OrderStatus,
  PoolType
});

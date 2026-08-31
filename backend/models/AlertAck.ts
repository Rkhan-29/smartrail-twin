// ============================================================
// models/AlertAck.ts
// ------------------------------------------------------------
// WHAT THIS FILE DOES (in plain English):
// This backend doesn't store "alerts" as their own collection —
// an alert is really just "a station whose latest crowd reading
// is high/critical", computed on the fly from CrowdLog (see
// app/api/alerts/route.ts). The one thing that DOES need to be
// remembered across requests is which of those computed alerts
// an operator has already acknowledged, so it doesn't keep
// popping back up as "new". This tiny collection stores exactly
// that: one row per acknowledged alert, keyed by the CrowdLog
// entry that triggered it.
// ============================================================

import { Schema, model, models, Types, type Document, type Model } from "mongoose";

export interface IAlertAck extends Document {
  crowdLog: Types.ObjectId;
  acknowledgedAt: Date;
}

const alertAckSchema = new Schema<IAlertAck>({
  crowdLog: { type: Schema.Types.ObjectId, ref: "CrowdLog", required: true, unique: true },
  acknowledgedAt: { type: Date, default: Date.now },
});

export const AlertAck: Model<IAlertAck> = models.AlertAck || model<IAlertAck>("AlertAck", alertAckSchema);

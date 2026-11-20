const mongoose = require("mongoose");

const visitSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true }, // معرّف فريد لكل زائر
    page: { type: String, default: "/" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Visit", visitSchema);
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Project category is required"],
      enum: ["medical", "food", "portfolio", "other"],
    },
    projectType: {
      type: String,
      enum: ["Frontend", "Full Stack", "Backend", "UI/UX"],
      default: "Frontend",
    },
    technologies: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
    projectUrl: {
      type: String,
      default: "",
      trim: true,
    },
    githubUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Project", projectSchema);
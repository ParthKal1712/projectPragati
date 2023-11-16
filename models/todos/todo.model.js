import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, "Content is required"],
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        subTodos: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Subtodo",
            }, //ARAY OF SUBTODOS
        ],
    },
    { timestamps: true }
);

export const Todo = mongoose.model("Todo", todoSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  data: Buffer;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    originalName: {
      type: String,
      default: '',
    },
    mimetype: {
      type: String,
      default: 'image/webp',
    },
    size: {
      type: Number,
      default: 0,
    },
    data: {
      type: Buffer,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Media = mongoose.model<IMedia>('Media', MediaSchema);

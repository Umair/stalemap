import { Schema, model } from "mongoose";

export interface IMeetup {
  title: string;
  startsAt: Date;
  endsAt: Date;
  online: boolean;
  venue?: string;
}

const meetupSchema = new Schema<IMeetup>({
  title: { type: String, required: true, trim: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date },
  online: { type: Boolean, default: false },
  venue: { type: String, trim: true },
});

export const Meetup = model<IMeetup>("Meetup", meetupSchema);

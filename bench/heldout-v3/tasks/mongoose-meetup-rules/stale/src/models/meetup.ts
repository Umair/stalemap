import { Schema, model } from "mongoose";

export interface IMeetup {
  title: string;
  startsAt: Date;
  endsAt: Date;
  online: boolean;
  venue?: string;
}

const TWO_HOURS = 2 * 60 * 60 * 1000;

const meetupSchema = new Schema<IMeetup>({
  title: { type: String, required: true, trim: true },
  startsAt: { type: Date, required: true },
  endsAt: {
    type: Date,
    default: function () {
      return new Date(this.startsAt.getTime() + TWO_HOURS);
    },
    validate: {
      validator: function (value: Date) {
        return value > this.startsAt;
      },
      message: "A meetup must end after it starts",
    },
  },
  online: { type: Boolean, default: false },
  venue: {
    type: String,
    trim: true,
    required: function () {
      return !this.online;
    },
  },
});

export const Meetup = model<IMeetup>("Meetup", meetupSchema);

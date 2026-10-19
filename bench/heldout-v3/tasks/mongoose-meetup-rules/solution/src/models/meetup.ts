import { Schema, model, Query, type HydratedDocument } from "mongoose";

export interface IMeetup {
  title: string;
  startsAt: Date;
  endsAt: Date;
  online: boolean;
  venue?: string;
}

type MeetupDocument = HydratedDocument<IMeetup>;

const TWO_HOURS = 2 * 60 * 60 * 1000;

const meetupSchema = new Schema<IMeetup>({
  title: { type: String, required: true, trim: true },
  startsAt: { type: Date, required: true },
  endsAt: {
    type: Date,
    default: function (this: MeetupDocument) {
      return this.startsAt ? new Date(this.startsAt.getTime() + TWO_HOURS) : undefined;
    },
    validate: {
      // Runs with the document on save/validate() and with the query for update validators.
      validator: function (value: Date) {
        const startsAt: Date | undefined = this instanceof Query ? this.get("startsAt") : this.startsAt;
        return !startsAt || !value || value > startsAt;
      },
      message: "A meetup must end after it starts",
    },
  },
  online: { type: Boolean, default: false },
  venue: {
    type: String,
    trim: true,
    required: function (this: MeetupDocument) {
      return !this.online;
    },
  },
});

export const Meetup = model<IMeetup>("Meetup", meetupSchema);

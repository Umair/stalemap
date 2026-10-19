import { Schema, model, type HydratedDocument } from "mongoose";

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
    default: function (): Date {
      return new Date(this.startsAt.getTime() + TWO_HOURS);
    },
    validate: {
      validator: function (value: Date): boolean {
        const meetup = this as HydratedDocument<IMeetup>;
        return value > meetup.startsAt;
      },
      message: "A meetup must end after it starts",
    },
  },
  online: { type: Boolean, default: false },
  venue: { type: String, trim: true, required: [function (): boolean { return !this.online; }, "In-person meetups need a venue"] },
});

export const Meetup = model<IMeetup>("Meetup", meetupSchema);

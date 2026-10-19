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
  endsAt: { type: Date },
  online: { type: Boolean, default: false },
  venue: { type: String, trim: true },
});

meetupSchema.pre("validate", function () {
  if (!this.endsAt && this.startsAt) this.endsAt = new Date(this.startsAt.getTime() + TWO_HOURS);
  if (!this.online && !this.venue) this.invalidate("venue", "In-person meetups need a venue");
  if (this.startsAt && this.endsAt && this.endsAt <= this.startsAt) {
    this.invalidate("endsAt", "A meetup must end after it starts");
  }
});

export const Meetup = model<IMeetup>("Meetup", meetupSchema);

import type { HalfDay } from './slots.js';

export interface RoomView {
  id: number;
  name: string;
  videoLink: string;
  closedThursdayAfternoon: boolean;
}

export interface SlotView {
  id: number;
  day: string;
  dayIndex: number;
  indexInDay: number;
  startMinutes: number;
  halfDay: HalfDay;
}

export interface SessionView {
  id: number;
  name: string;
  startDate: string;
  days: string[];
  rooms: RoomView[];
  slots: SlotView[];
  defenseCount: number;
}

export interface RoomInput {
  name: string;
  videoLink: string;
  closedThursdayAfternoon: boolean;
}

export class NoSession extends Error {
  constructor() {
    super('No session yet: create it first');
  }
}

export class SessionAlreadyExists extends Error {
  constructor() {
    super('A session already exists: the app manages one session at a time');
  }
}

export class StartDateNotMonday extends Error {
  constructor(day: string) {
    super(`${day} is not a Monday: a session runs from Monday to Friday`);
  }
}

export class SessionHasDefenses extends Error {
  constructor(count: number) {
    super(`The start date cannot change: ${count} defense(s) already placed`);
  }
}

export class RoomNotFound extends Error {
  constructor(id: number) {
    super(`Room ${id} not found`);
  }
}

export class RoomNameTaken extends Error {
  constructor(name: string) {
    super(`A room is already named ${name}`);
  }
}

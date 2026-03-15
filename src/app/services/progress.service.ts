import { Injectable } from '@angular/core';

interface DayProgress {
  date: string;
  completedSteps: number[];
}

interface StreakData {
  morning: number;
  evening: number;
  lastMorning: string;
  lastEvening: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getProgress(type: 'Morning' | 'Evening'): DayProgress {
    const key = type === 'Morning' ? 'progress_morning' : 'progress_evening';
    const raw = localStorage.getItem(key);
    if (raw) {
      const data: DayProgress = JSON.parse(raw);
      if (data.date === this.getToday()) {
        return data;
      }
    }
    return { date: this.getToday(), completedSteps: [] };
  }

  private saveProgress(type: 'Morning' | 'Evening', data: DayProgress): void {
    const key = type === 'Morning' ? 'progress_morning' : 'progress_evening';
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getStreakData(): StreakData {
    const raw = localStorage.getItem('streaks');
    return raw
      ? JSON.parse(raw)
      : { morning: 0, evening: 0, lastMorning: '', lastEvening: '' };
  }

  private saveStreakData(data: StreakData): void {
    localStorage.setItem('streaks', JSON.stringify(data));
  }

  toggleStep(type: 'Morning' | 'Evening', stepIndex: number): void {
    const progress = this.getProgress(type);
    const idx = progress.completedSteps.indexOf(stepIndex);
    if (idx > -1) {
      progress.completedSteps.splice(idx, 1);
    } else {
      progress.completedSteps.push(stepIndex);
    }
    this.saveProgress(type, progress);
  }

  isStepDone(type: 'Morning' | 'Evening', stepIndex: number): boolean {
    return this.getProgress(type).completedSteps.includes(stepIndex);
  }

  getDoneCount(type: 'Morning' | 'Evening'): number {
    return this.getProgress(type).completedSteps.length;
  }

  markRoutineComplete(type: 'Morning' | 'Evening'): void {
    const streaks = this.getStreakData();
    const today = this.getToday();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (type === 'Morning') {
      if (streaks.lastMorning === today) return;
      streaks.morning = streaks.lastMorning === yesterday ? streaks.morning + 1 : 1;
      streaks.lastMorning = today;
    } else {
      if (streaks.lastEvening === today) return;
      streaks.evening = streaks.lastEvening === yesterday ? streaks.evening + 1 : 1;
      streaks.lastEvening = today;
    }
    this.saveStreakData(streaks);
  }

  getStreak(type: 'Morning' | 'Evening'): number {
    const streaks = this.getStreakData();
    const today = this.getToday();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (type === 'Morning') {
      if (streaks.lastMorning === today || streaks.lastMorning === yesterday) {
        return streaks.morning;
      }
      return 0;
    } else {
      if (streaks.lastEvening === today || streaks.lastEvening === yesterday) {
        return streaks.evening;
      }
      return 0;
    }
  }
}

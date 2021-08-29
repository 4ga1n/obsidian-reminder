import { Plugin_2 } from "obsidian";
import { Reference } from "./model/ref";
import { Reminder, Reminders } from "./model/reminder";
import { DateTime, Time } from "./model/time";

interface ReminderPluginData {
  settings: ReminderSettings;
  reminders: any;
  scanned: boolean;
}

interface ReminderData {
  title: string;
  time: string;
  rowNumber: number;
}

interface ReminderSettings {
  reminderTime: string;
  useSystemNotification: boolean;
  laters: string;
}

const DEFAULT_PLUGIN_DATA: ReminderPluginData = {
  settings: {
    reminderTime: "09:00",
    useSystemNotification: false,
    laters: "In 30 minutes\nIn 1 hour\nIn 3 hours\nTomorrow\nNext week"
  },
  reminders: {} as Map<string, Array<ReminderData>>,
  scanned: false,
};

export class PluginDataIO {

  changed: boolean = false;
  public scanned: Reference<boolean> = new Reference(false);
  public reminderTime: Reference<Time> = new Reference(Time.parse("09:00"));
  public useSystemNotification: Reference<boolean> = new Reference(false);
  public laters: Reference<string> = new Reference(DEFAULT_PLUGIN_DATA.settings.laters);

  constructor(private plugin: Plugin_2, private reminders: Reminders) {
    [
      this.reminderTime,
      this.scanned,
      this.useSystemNotification,
      this.laters
    ].forEach((setting) => {
      setting.onChanged(() => {
        this.changed = true;
      });
    })
  }

  async load() {
    console.debug("Load reminder plugin data");
    const data = Object.assign(
      {},
      DEFAULT_PLUGIN_DATA,
      await this.plugin.loadData()
    ) as ReminderPluginData;
    this.scanned.value = data.scanned;
    this.reminderTime.value = Time.parse(data.settings.reminderTime);
    this.useSystemNotification.value = data.settings.useSystemNotification;
    if (data.reminders) {
      Object.keys(data.reminders).forEach((filePath) => {
        const remindersInFile = data.reminders[filePath] as Array<ReminderData>;
        if (!remindersInFile) {
          return;
        }
        this.reminders.replaceFile(
          filePath,
          remindersInFile.map(
            (d) =>
              new Reminder(
                filePath,
                d.title,
                DateTime.parse(d.time),
                d.rowNumber
              )
          )
        );
      });
    }
    this.changed = false;
  }

  async save(force: boolean = false) {
    if (!force && !this.changed) {
      return;
    }
    console.debug(
      "Save reminder plugin data: force=%s, changed=%s",
      force,
      this.changed
    );
    const remindersData: any = {};
    this.reminders.fileToReminders.forEach((r, filePath) => {
      remindersData[filePath] = r.map((rr) => ({
        title: rr.title,
        time: rr.time.toString(),
        rowNumber: rr.rowNumber,
      }));
    });
    await this.plugin.saveData({
      scanned: this.scanned.value,
      reminders: remindersData,
      settings: {
        reminderTime: this.reminderTime.value.toString(),
        useSystemNotification: this.useSystemNotification.value,
        laters: this.laters
      },
    });
    this.changed = false;
  }
}

import { MarkdownView, TAbstractFile, TFile, Vault, WorkspaceLeaf } from 'obsidian';
import { Content } from 'model/content';
import type { Reminder, Reminders } from 'model/reminder';
import type { ReminderPluginUI } from 'plugin/ui';

export class RemindersController {
  constructor(private vault: Vault, private ui: ReminderPluginUI, private reminders: Reminders) {}

  async removeFile(path: string): Promise<boolean> {
    console.debug('Remove file: path=%s', path);
    const result = this.reminders.removeFile(path);
    this.reloadUI();
    return result;
  }

  async reloadFile(file: TAbstractFile, reloadUI: boolean = false) {
    console.debug('Reload file and collect reminders: file=%s, forceReloadUI=%s', file.path, reloadUI);
    if (!(file instanceof TFile)) {
      console.debug('Cannot read file other than TFile: file=%o', file);
      return false;
    }
    if (!this.isMarkdownFile(file)) {
      console.debug('Not a markdown file: file=%o', file);
      return false;
    }
    const content = new Content(file.path, await this.vault.cachedRead(file));
    const reminders = content.getReminders();
    if (reminders.length > 0) {
      if (!this.reminders.replaceFile(file.path, reminders)) {
        return false;
      }
    } else {
      if (!this.reminders.removeFile(file.path)) {
        return false;
      }
    }
    if (reloadUI) {
      this.reloadUI();
    }
    return true;
  }

  isMarkdownFile(file: TFile) {
    return file.extension.toLowerCase() === 'md';
  }

  async reloadAllFiles() {
    console.debug('Reload all files and collect reminders');
    this.reminders.clear();
    for (const file of this.vault.getMarkdownFiles()) {
      await this.reloadFile(file, false);
    }
    this.reloadUI();
  }

  async updateReminder(reminder: Reminder, checked: boolean) {
    const file = this.vault.getAbstractFileByPath(reminder.file);
    if (!(file instanceof TFile)) {
      console.error('file is not instance of TFile: %o', file);
      return;
    }
    const content = new Content(file.path, await this.vault.read(file));
    await content.updateReminder(reminder, {
      checked,
      time: reminder.time,
    });
    await this.vault.modify(file, content.getContent());
  }

  private reloadUI() {
    console.debug('Reload reminder list view');
    this.ui.reload(true);
  }
}

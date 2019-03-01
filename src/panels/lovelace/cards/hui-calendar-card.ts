import {
  html,
  css,
  CSSResult,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  property,
} from "lit-element";

import moment from "moment";

import "../../../components/ha-card";

import { LovelaceCard, LovelaceCardEditor } from "../types";
import { LovelaceCardConfig } from "../../../data/lovelace";
import { HomeAssistant } from "../../../types";

export interface Config extends LovelaceCardConfig {
  title?: string;
  hideTitle?: boolean;
  numberOfDays: number;
  entities: string[];
  timeFormat: string;
  progressBar: boolean;
}

export class HuiCalendarCard extends LitElement implements LovelaceCard {
  // public static async getConfigElement(): Promise<LovelaceCardEditor> {
  //   await import(/* webpackChunkName: "hui-picture-card-editor" */ "../editor/config-elements/hui-picture-card-editor");
  //   return document.createElement("hui-picture-card-editor");
  // }

  public static getStubConfig(): object {
    return {};
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: Config;
  @property() private _loading?: boolean = true;

  private _events?: any = []; // save events gotten asyncronously

  public getCardSize(): number {
    return 8;
  }

  public setConfig(config: Config): void {
    if (!config || !config.entities) {
      throw new Error("Invalid Configuration: 'entities' required");
    }

    this._config = {
      title: "Calendar",
      hideTitle: false,
      numberOfDays: 7,
      timeFormat: "HH:mm",
      progressBar: false,
      ...config,
    };
  }

  private firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    // on first render need to fetch calendar events
    this.getEvents();
  }

  private render(): TemplateResult | void {
    if (!this._config || !this.hass) return;

    return html`
      <ha-card class="calendar-card">
        ${this.createHeader()}
        <table>
          <tbody>
            ${this.createCardBody()}
          </tbody>
        </table>
      </ha-card>
    `;
  }

  private createCardBody() {
    if (this._loading) {
      return html`
        <div class="loading-container">
          <paper-spinner active></paper-spinner>
        </div>
      `;
    }

    const groupedEventsByDay = this.groupEventsByDay();

    return groupedEventsByDay.reduce((htmlTemplate, eventDay) => {
      const momentDay = moment(eventDay.day);

      // for each event in a day create template for that event
      const eventsTemplate = eventDay.events.map(
        (event, index) => html`
          <tr
            class="day-wrapper ${eventDay.events.length === index + 1
              ? " day-wrapper-last"
              : ""}"
          >
            <td class="date">
              <div>${index === 0 ? momentDay.format("DD") : ""}</div>
              <div>${index === 0 ? momentDay.format("ddd") : ""}</div>
            </td>
            <td class="overview">
              <div class="title">${event.message}</div>
              <div class="time">${this.getTimeHtml(event)}</div>
              ${this._config.progressBar ? this.buildProgressBar(event) : ""}
            </td>
            <td class="location">
              ${this.getLocationHtml(event)}
            </td>
          </tr>
        `
      );

      // add current day container to overall template
      return html`
        ${htmlTemplate} ${eventsTemplate}
      `;
    }, html``);
  }

  private async getEvents(): Promise<void> {
    for await (let entityId of this._config.entities) {
      try {
        const events = await this.hass.connection.sendMessagePromise({
          type: "calendar/events",
          entity_id: entityId,
        });

        this._events = this._events.concat(events);
      } catch (err) {
        console.log(err);
      }
    }

    this._loading = false;
  }

  /**
   * Groups events by the day it's on
   */
  private groupEventsByDay() {
    return this._events.reduce((groupedEvents, event) => {
      const day = moment(event.start).format("YYYY-MM-DD");
      const matchingDateIndex = groupedEvents.findIndex(
        (group) => group.day === day
      );

      if (matchingDateIndex > -1) {
        groupedEvents[matchingDateIndex].events.push(event);
      } else {
        groupedEvents.push({ day, events: [event] });
      }

      return groupedEvents;
    }, []);
  }

  private getTimeHtml(event): TemplateResult {
    if (event.all_day)
      return html`
        All day
      `;

    const start = moment(event.start).format(this._config.timeFormat);
    const end = moment(event.end).format(this._config.timeFormat);
    return html`
      ${start} - ${end}
    `;
  }

  private getLocationHtml(event) {
    if (!event.location) return html``;

    return html`
      <a
        href="https://www.google.com/maps?daddr=${event.location}"
        target="_blank"
        rel="nofollow noreferrer noopener"
        title="open location"
      >
        <ha-icon icon="mdi:map-marker"></ha-icon>&nbsp;
      </a>
    `;
  }

  private createHeader(): TemplateResult {
    if (this._config.hideTitle) return html``;

    return html`
      <div class="header">
        ${this._config.title}
      </div>
    `;
  }

  private buildProgressBar(event): TemplateResult {
    if (!event.start || !event.end || event.all_day) return html``;

    const now = moment(new Date());
    const start = moment(event.start);
    const end = moment(event.end);
    if (
      now.isBefore(start) ||
      now.isSameOrAfter(end) ||
      !start.isValid() ||
      !end.isValid()
    )
      return html``;

    // build percent done for event
    const nowSeconds = now.unix();
    const startSeconds = start.unix();
    const endSeconds = end.unix();
    const percent =
      ((nowSeconds - startSeconds) / (endSeconds - startSeconds)) * 100;

    return html`
      <ha-icon
        icon="mdi:circle"
        class="progress-bar"
        style="margin-left:${percent}%;"
      ></ha-icon>
      <hr class="progress-bar" />
    `;
  }

  static get styles(): CSSResult {
    return css`
      .calendar-card {
        display: flex;
        padding: 0 16px 4px;
        flex-direction: column;
      }

      .loading-container {
        margin: 50px 0 50px 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header {
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-headline_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        text-rendering: var(
          --paper-font-common-expensive-kerning_-_text-rendering
        );
        opacity: var(--dark-primary-opacity);
        padding: 24px 0px 0px;
      }

      table {
        border-spacing: 0;
        margin-bottom: 10px;
      }

      .day-wrapper td {
        padding-top: 10px;
      }

      .day-wrapper.day-wrapper-last > td {
        padding-bottom: 10px;
        border-bottom: 1px solid;
      }

      .day-wrapper.day-wrapper-last:last-child > td {
        border-bottom: 0 !important;
      }
      .day-wrapper .overview {
        padding-left: 10px;
      }

      .day-wrapper .overview .title {
        font-size: 1.2em;
      }

      .day-wrapper .overview .time,
      .day-wrapper .location ha-icon {
        color: var(--primary-color);
      }

      .day-wrapper hr.progress-bar {
        border-style: solid;
        border-color: var(--accent-color);
        border-width: 1px 0 0 0;
        margin-top: -7px;
        margin-left: 0px;
        color: var(--primary-color);
        width: 100%;
      }

      .day-wrapper ha-icon.progress-bar {
        height: 12px;
        width: 12px;
        color: var(--accent-color);
      }

      .day-wrapper .location a {
        text-decoration: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-calendar-card": HuiCalendarCard;
  }
}

customElements.define("hui-calendar-card", HuiCalendarCard);

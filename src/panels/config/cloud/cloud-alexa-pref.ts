import {
  html,
  LitElement,
  PropertyDeclarations,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-toggle-button/paper-toggle-button";
// tslint:disable-next-line
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";

import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import "./cloud-exposed-entities";
import { CloudStatusLoggedIn, updateCloudPref } from "../../../data/cloud";

export class CloudAlexaPref extends LitElement {
  public hass?: HomeAssistant;
  public cloudStatus?: CloudStatusLoggedIn;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cloudStatus: {},
    };
  }

  protected render(): TemplateResult | void {
    if (!this.cloudStatus) {
      return html``;
    }

    const enabled = this.cloudStatus!.prefs.alexa_enabled;

    return html`
      <paper-card heading="Alexa">
        <paper-toggle-button
          .checked="${enabled}"
          @change="${this._toggleChanged}"
        ></paper-toggle-button>
        <div class="card-content">
          With the Alexa integration for Home Assistant Cloud you'll be able to
          control all your Home Assistant devices via any Alexa-enabled device.
          <ul>
            <li>
              To activate, search in the Alexa app for the Home Assistant Smart
              Home skill.
            </li>
            <li>
              <a
                href="https://www.nabucasa.com/config/amazon_alexa/"
                target="_blank"
              >
                Config documentation
              </a>
            </li>
          </ul>
          <em
            >This integration requires an Alexa-enabled device like the Amazon
            Echo.</em
          >
          ${enabled
            ? html`
                <p>Exposed entities:</p>
                <cloud-exposed-entities
                  .hass="${this.hass}"
                  .filter="${this.cloudStatus!.alexa_entities}"
                  .supportedDomains="${this.cloudStatus!.alexa_domains}"
                ></cloud-exposed-entities>
              `
            : ""}
        </div>
      </paper-card>
    `;
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as PaperToggleButtonElement;
    try {
      await updateCloudPref(this.hass!, { alexa_enabled: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      toggle.checked = !toggle.checked;
    }
  }

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
      paper-card > paper-toggle-button {
        position: absolute;
        right: 8px;
        top: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-alexa-pref": CloudAlexaPref;
  }
}

customElements.define("cloud-alexa-pref", CloudAlexaPref);

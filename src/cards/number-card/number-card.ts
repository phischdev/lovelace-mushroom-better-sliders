import { HassEntity } from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, nothing, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import {
    actionHandler,
    ActionHandlerEvent,
    computeRTL,
    computeStateDisplay,
    formatNumber,
    getDefaultFormatOptions,
    getNumberFormatOptions,
    handleAction,
    hasAction,
    HomeAssistant,
    isActive,
    LovelaceCard,
    LovelaceCardEditor,
} from "../../ha";
import "../../shared/badge-icon";
import "../../shared/button";
import "../../shared/card";
import "../../shared/shape-avatar";
import "../../shared/shape-icon";
import "../../shared/state-info";
import "../../shared/state-item";
import { computeAppearance } from "../../utils/appearance";
import { MushroomBaseCard } from "../../utils/base-card";
import { cardStyle } from "../../utils/card-styles";
import { computeRgbColor } from "../../utils/colors";
import { registerCustomCard } from "../../utils/custom-cards";
import { computeEntityPicture } from "../../utils/info";
import { NUMBER_CARD_EDITOR_NAME, NUMBER_CARD_NAME, NUMBER_ENTITY_DOMAINS } from "./const";
import "./controls/number-value-control";
import { NumberCardConfig } from "./number-card-config";

registerCustomCard({
    type: NUMBER_CARD_NAME,
    name: "Mushroom Number Card",
    description: "Card for number and input number entity",
});

@customElement(NUMBER_CARD_NAME)
export class NumberCard extends MushroomBaseCard implements LovelaceCard {
    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        await import("./number-card-editor");
        return document.createElement(NUMBER_CARD_EDITOR_NAME) as LovelaceCardEditor;
    }

    public static async getStubConfig(hass: HomeAssistant): Promise<NumberCardConfig> {
        const entities = Object.keys(hass.states);
        const numbers = entities.filter((e) => NUMBER_ENTITY_DOMAINS.includes(e.split(".")[0]));
        return {
            type: `custom:${NUMBER_CARD_NAME}`,
            entity: numbers[0],
        };
    }

    @state() private _config?: NumberCardConfig;

    @state() private value?: number;

    getCardSize(): number | Promise<number> {
        return 1;
    }

    setConfig(config: NumberCardConfig): void {
        this._config = {
            tap_action: {
                action: "more-info",
            },
            hold_action: {
                action: "more-info",
            },
            ...config,
        };
    }

    private _handleAction(ev: ActionHandlerEvent) {
        handleAction(this, this.hass!, this._config!, ev.detail.action!);
    }

    private onCurrentValueChange(e: CustomEvent<{ value?: number }>): void {
        if (e.detail.value != null) {
            this.value = e.detail.value;
        }
    }

    protected render() {
        if (!this._config || !this.hass || !this._config.entity) {
            return nothing;
        }

        const entityId = this._config.entity;
        const stateObj = this.hass.states[entityId] as HassEntity | undefined;

        if (!stateObj) {
            return this.renderNotFound(this._config);
        }

        const name = this._config.name || stateObj.attributes.friendly_name || "";
        const icon = this._config.icon;
        const appearance = computeAppearance(this._config);
        const picture = computeEntityPicture(stateObj, appearance.icon_type);

        let stateDisplay = computeStateDisplay(
            this.hass.localize,
            stateObj,
            this.hass.locale,
            this.hass.config,
            this.hass.entities
        );
        if (this.value !== undefined) {
            const numberValue = formatNumber(
                this.value,
                this.hass.locale,
                getNumberFormatOptions(stateObj, this.hass.entities[stateObj.entity_id]) ??
                    getDefaultFormatOptions(stateObj.state)
            );
            stateDisplay = `${numberValue} ${stateObj.attributes.unit_of_measurement ?? ""}`;
        }

        const rtl = computeRTL(this.hass);

        const sliderStyle = {};
        const iconColor = this._config?.icon_color;
        if (iconColor) {
            const iconRgbColor = computeRgbColor(iconColor);
            sliderStyle["--slider-color"] = `rgb(${iconRgbColor})`;
            sliderStyle["--slider-bg-color"] = `rgba(${iconRgbColor}, 0.2)`;
        }

        return html`
            <ha-card class=${classMap({ "fill-container": appearance.fill_container })}>
                <mushroom-card .appearance=${appearance} ?rtl=${rtl}>
                    <mushroom-state-item
                        ?rtl=${rtl}
                        .appearance=${appearance}
                        @action=${this._handleAction}
                        .actionHandler=${actionHandler({
                            hasHold: hasAction(this._config.hold_action),
                            hasDoubleClick: hasAction(this._config.double_tap_action),
                        })}
                    >
                        ${picture ? this.renderPicture(picture) : this.renderIcon(stateObj, icon)}
                        ${this.renderBadge(stateObj)}
                        ${this.renderStateInfo(stateObj, appearance, name, stateDisplay)};
                    </mushroom-state-item>
                    <div class="actions" ?rtl=${rtl}>
                        <mushroom-number-value-control
                            .hass=${this.hass}
                            .entity=${stateObj}
                            .displayMode=${this._config.display_mode}
                            style=${styleMap(sliderStyle)}
                            @current-change=${this.onCurrentValueChange}
                        ></mushroom-number-value-control>
                    </div>
                </mushroom-card>
            </ha-card>
        `;
    }

    renderIcon(stateObj: HassEntity, icon?: string): TemplateResult {
        const active = isActive(stateObj);
        const iconStyle = {};
        const iconColor = this._config?.icon_color;
        if (iconColor) {
            const iconRgbColor = computeRgbColor(iconColor);
            iconStyle["--icon-color"] = `rgb(${iconRgbColor})`;
            iconStyle["--shape-color"] = `rgba(${iconRgbColor}, 0.2)`;
        }
        return html`
            <mushroom-shape-icon slot="icon" .disabled=${!active} style=${styleMap(iconStyle)}>
                <ha-state-icon .state=${stateObj} .icon=${icon}></ha-state-icon>
            </mushroom-shape-icon>
        `;
    }

    static get styles(): CSSResultGroup {
        return [
            super.styles,
            cardStyle,
            css`
                mushroom-state-item {
                    cursor: pointer;
                }
                mushroom-shape-icon {
                    --icon-color: rgb(var(--rgb-state-number));
                    --shape-color: rgba(var(--rgb-state-number), 0.2);
                }
                mushroom-number-value-control {
                    flex: 1;
                }
            `,
        ];
    }
}

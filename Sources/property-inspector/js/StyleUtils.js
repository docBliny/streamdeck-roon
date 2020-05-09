// Source: https://github.com/elgatosf/streamdeck-pisamples

export default class StyleUtils {
  /**
   * Quick utility to lighten or darken a color (doesn't take color-drifting, etc. into account)
   *
   * Usage:
   *   StyleUtils.fadeColor("#061261", 100); // will lighten the color
   *   StyleUtils.fadeColor("#200867"), -100); // will darken the color
   *
   * @param      {string}  color   The color.
   * @param      {<type>}  amount  The amount.
   *
   * @return     {string}  The modified color.
   */
  static fadeColor (color, amount) {
    const min = Math.min, max = Math.max;
    const num = parseInt(color.replace(/#/g, ""), 16);
    const r = min(255, max((num >> 16) + amount, 0));
    const g = min(255, max((num & 0x0000FF) + amount, 0));
    const b = min(255, max(((num >> 8) & 0x00FF) + amount, 0));
    return "#" + (g | (b << 8) | (r << 16)).toString(16).padStart(6, 0);
  }

  static addDynamicStyles(colors) {
    const node = document.getElementById("#sdpi-dynamic-styles") || document.createElement("style");
    if (!colors.mouseDownColor) colors.mouseDownColor = StyleUtils.fadeColor(colors.highlightColor, -100);
    const color = colors.highlightColor.slice(0, 7);
    const color1 = StyleUtils.fadeColor(color, 100);
    const color2 = StyleUtils.fadeColor(color, 60);
    const metersActiveColor = StyleUtils.fadeColor(color, -60);

    node.setAttribute("id", "sdpi-dynamic-styles");
    node.innerHTML = `
    input[type="radio"]:checked + label span,
    input[type="checkbox"]:checked + label span {
      background-color: ${colors.highlightColor};
    }
    input[type="radio"]:active:checked + label span,
    input[type="radio"]:active + label span,
    input[type="checkbox"]:active:checked + label span,
    input[type="checkbox"]:active + label span {
      background-color: ${colors.mouseDownColor};
    }
    input[type="radio"]:active + label span,
    input[type="checkbox"]:active + label span {
      background-color: ${colors.buttonPressedBorderColor};
    }
    td.selected,
    td.selected:hover,
    li.selected:hover,
    li.selected {
      color: white;
      background-color: ${colors.highlightColor};
    }
    .sdpi-file-label > label:active,
    .sdpi-file-label.file:active,
    label.sdpi-file-label:active,
    label.sdpi-file-info:active,
    input[type="file"]::-webkit-file-upload-button:active,
    button:active {
      background-color: ${colors.buttonPressedBackgroundColor};
      color: ${colors.buttonPressedTextColor};
      border-color: ${colors.buttonPressedBorderColor};
    }
    ::-webkit-progress-value,
    meter::-webkit-meter-optimum-value {
      background: linear-gradient(${color2}, ${color1} 20%, ${color} 45%, ${color} 55%, ${color2})
    }
    ::-webkit-progress-value:active,
    meter::-webkit-meter-optimum-value:active {
      background: linear-gradient(${color}, ${color2} 20%, ${metersActiveColor} 45%, ${metersActiveColor} 55%, ${color})
    }
    `;
    document.body.appendChild(node);
  }
}
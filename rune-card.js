module.exports = {
  defaultConfig: {
    enabled: true,
    Stars: 1,
    Common: true,
    Magic: true,
    Rare: true,
    Hero: true,
    Legend: true,
  },
  defaultConfigDetails: {
    Stars: { label: "Minimum ⭐ to show the runecard: ", type: "number" },
    Common: { label: "⚪ Common" },
    Magic: { label: "🟢 Magic" },
    Rare: { label: "🔵 Rare" },
    Hero: { label: "🟣 Hero" },
    Legend: { label: "🟠 Legend" },
  },
  pluginName: "🧙RuneCard",
  pluginDescription: "Logs runes details as they drop.",

  init(proxy) {
    proxy.on("apiCommand", (req, resp) => {
      if (config.Config.Plugins[this.pluginName].enabled) {
        this.processCommand(proxy, req, resp);
      }
    });
  },

  processCommand(proxy, req, resp) {
    const { command } = req;
    let runesInfo = [];

    // Extract the rune details and display it's efficiency stats.
    switch (command) {
      case "BattleDungeonResult":
      case "BattleScenarioResult":
      case "BattleDimensionHoleDungeonResult":
        if (resp.win_lose === 1) {
          const reward = resp.reward ? resp.reward : {};

          if (reward.crate && reward.crate.rune) {
            if (
              this.shouldLogRuneDrop(config, this.pluginName, reward.crate.rune)
            ) {
              runesInfo.push(this.logRuneDrop(reward.crate.rune));
            }
          }
        }
        break;
      case "BattleDungeonResult_V2":
      case "BattleDimensionHoleDungeonResult_v2":
        if (resp.win_lose === 1) {
          const rewards = resp.changed_item_list ? resp.changed_item_list : [];

          if (rewards) {
            rewards.forEach((reward) => {
              if (reward.type === 8) {
                if (
                  this.shouldLogRuneDrop(config, this.pluginName, reward.info)
                ) {
                  runesInfo.push(this.logRuneDrop(reward.info));
                }
              }
            });
          }
        }
        break;
      case "upgradeRune_v2": {
        const newLevel = resp.rune.upgrade_curr;

        if (newLevel % 3 === 0 && newLevel <= 15) {
          if (this.shouldLogRuneDrop(config, this.pluginName, resp.rune)) {
            runesInfo.push(this.logRuneDrop(resp.rune));
          }
        }
        break;
      }
      case "AmplifyRune":
      case "AmplifyRune_v2":
      case "ConvertRune":
      case "ConvertRune_v2":
      case "ConfirmRune":
        if (this.shouldLogRuneDrop(config, this.pluginName, resp.rune)) {
          runesInfo.push(this.logRuneDrop(resp.rune));
        }
        break;

      case "BuyBlackMarketItem":
        if (resp.runes && resp.runes.length === 1) {
          if (this.shouldLogRuneDrop(config, this.pluginName, resp.runes[0])) {
            runesInfo.push(this.logRuneDrop(resp.runes[0]));
          }
        }
        break;

      case "BuyGuildBlackMarketItem":
        if (resp.runes && resp.runes.length === 1) {
          if (this.shouldLogRuneDrop(config, this.pluginName, resp.runes[0])) {
            runesInfo.push(this.logRuneDrop(resp.runes[0]));
          }
        }
        break;

      case "BuyShopItem":
        if (resp.reward && resp.reward.crate && resp.reward.crate.runes) {
          resp.reward.crate.runes.forEach((rune) => {
            if (this.shouldLogRuneDrop(config, this.pluginName, rune)) {
              runesInfo.push(this.logRuneDrop(rune));
            }
          });
        }
        break;

      case "GetBlackMarketList":
        resp.market_list.forEach((item) => {
          if (item.item_master_type === 8 && item.runes) {
            if (
              this.shouldLogRuneDrop(config, this.pluginName, item.runes[0])
            ) {
              runesInfo.push(this.logRuneDrop(item.runes[0]));
            }
          }
        });
        break;

      case "GetGuildBlackMarketList":
        resp.market_list.forEach((item) => {
          if (item.item_master_type === 8 && item.runes) {
            if (
              this.shouldLogRuneDrop(config, this.pluginName, item.runes[0])
            ) {
              runesInfo.push(this.logRuneDrop(item.runes[0]));
            }
          }
        });
        break;

      case "BattleWorldBossResult": {
        const reward = resp.reward ? resp.reward : {};

        if (reward.crate && reward.crate.runes) {
          reward.crate.runes.forEach((rune) => {
            if (this.shouldLogRuneDrop(config, this.pluginName, rune)) {
              runesInfo.push(this.logRuneDrop(rune));
            }
          });
        }
        break;
      }
      case "BattleRiftDungeonResult":
        if (resp.item_list) {
          resp.item_list.forEach((item) => {
            if (item.type === 8) {
              if (this.shouldLogRuneDrop(config, this.pluginName, item.info)) {
                runesInfo.push(this.logRuneDrop(item.info));
              }
            }
          });
        }
        break;

      case "RevalueRune":
        if (this.shouldLogRuneDrop(config, this.pluginName, resp.rune)) {
          runesInfo.push(
            "New rune efficiency value:" + this.logRuneDrop(resp.rune)
          );
        }

      case "ReceiveMail":
      case "RewardDailyQuest": {
        if (resp?.rune_list?.length > 0) {
          resp.rune_list.forEach((rune) => {
            if (this.shouldLogRuneDrop(config, this.pluginName, rune)) {
              runesInfo.push(this.logRuneDrop(rune));
            }
          });
        }
        break;
      }

      default:
        break;
    }

    if (runesInfo.length > 0) {
      proxy.log({
        type: "success",
        source: "plugin",
        name: this.pluginName,
        message: this.mountRuneListHtml(runesInfo),
      });
    }
  },

  shouldLogRuneDrop(config, pluginName, rune) {
    let runeClass = gMapping.isAncient(rune) ? rune.class - 10 : rune.class;

    return (
      config.Config.Plugins[pluginName][this.rune.quality[rune.extra]] &&
      runeClass >= Number(config.Config.Plugins[pluginName].Stars)
    );
  },

  logRuneDrop(rune) {
    const efficiency = this.getRuneEfficiency(rune);
    const runeOriginQuality = this.rune.quality[rune.extra];
    const colorTable = {
      Common: "#A59DA5",
      Magic: "#79C653",
      Rare: "#62a7cf",
      Hero: "#DF8EF0",
      Legend: "#F5A951",
    };

    const gradientTable = {
      Common: "linear-gradient(to bottom left, #635e63, #A59DA5),",
      Magic: "linear-gradient(to bottom left, #487432, #79C653),",
      Rare: "linear-gradient(to bottom left, #5973bb, #62a7cf),",
      Hero: "linear-gradient(to bottom left, #8e7ed3, #DF8EF0),",
      Legend: "linear-gradient(to bottom left, #f56451, #F5A951),",
    };

    let advice = [];
    let color = colorTable[runeOriginQuality];
    let gradiantColors = gradientTable[runeOriginQuality];

    let runePrimaryStats = this.mountRunePrimaryStats(
      rune,
      efficiency,
      color,
      gradiantColors
    );
    let runeSubstats = this.mountRuneSubstats(rune, advice);

    return `<div class="rune-card">
                <style scoped>
                  ${this.getScopeCss()}
                </style>
                <div class="rune-content">
                  ${runePrimaryStats} 
                  ${runeSubstats}
                </div>
                ${
                  advice.length > 0
                    ? `<div class="footer"><img src="https://i.imgur.com/nUcfMQt.png" style="width: 30px; margin: 0 5px 0 0;" />${advice[0][1]}</div>`
                    : ""
                }
              </div>`;
  },

  mountRuneIcon(rune) {
    const positionSetTable = {
      1: ["36", "28"],
      2: ["34", "24"],
      3: ["34", "20"],
      4: ["38", "22"],
      5: ["38", "20"],
      6: ["40", "24"],
    };

    let html = "";

    html = html.concat(`
    ${rune.class > 10 ? "<div class='halo'></div>" : ""}
    <div class="rune-icon">
      <img class="slot" src="${this.rune.slot_url[rune.slot_no]}" />
      <img class="set" style="--left-rune-icon-set: ${
        positionSetTable[rune.slot_no][0]
      }px; --top-rune-icon-set: ${
      positionSetTable[rune.slot_no][1]
    }px;" src="../assets/runes/${this.rune.sets[rune.set_id]}.png" />
      
    </div>
    `);

    return html;
  },

  mountRunePrimaryStats(rune, efficiency, color, gradiantColors) {
    let runeIcon = this.mountRuneIcon(rune, color);
    let starSpan = this.mountStarsSpan(rune);

    return `
    <div class="rune-content-container" style="background-image: ${gradiantColors} url('${
      this.rune.content_url.runecard_background
    }'); background-blend-mode: color;">
      <div class="rune-left-info">
        <span class="ancient">${
          rune.class > 10
            ? "<img class='ancient' src='" +
              this.rune.content_url.ancient_icon +
              "' />"
            : ""
        }</span>
        <span class="upgrade">${rune.upgrade_curr}</span>
      </div>
      ${runeIcon}
      <div class="rune-primary-stats">
        <div class="rune-primary-stats-container">
          <div class="rune-stars">${starSpan}</div>
          <div class="rune-main-stat">
            <span>${this.rune.effectTypesDisplay[rune.pri_eff[0]]} +${
      rune.pri_eff[1]
    }${this.displayPoucent(rune.pri_eff[0])}<span>
          </div>
          <div class="rune-inner-stat">
            ${this.displayInnerStat(rune)}
          </div>
        </div>
      </div>
      <div class="rune-efficiencies">
        <div class="rune-efficiencies-container">
          <div class="rune-efficiency-max">
            <span style="background: ${color};">max: ${
      efficiency.maxWithGrind
    }%</span>
          </div>
          <div class="spacer"></div>
          <div class="rune-efficiency">
            ${efficiency.current}%
          </div>
        </div>
      </div>
  </div>
   `;
  },

  mountStarsSpan(rune) {
    let count = 0;
    let html = '<div class="star-line">';
    const positionStarTable = {
      1: "0",
      2: "10",
      3: "20",
      4: "30",
      5: "40",
      6: "50",
    };
    let isUpgradeMax = rune.upgrade_curr === rune.upgrade_limit ? true : false;
    let runeClass = gMapping.isAncient(rune) ? rune.class - 10 : rune.class;
    let starAwaken = this.rune.content_url.star_awaken;
    let starUnawaken = this.rune.content_url.star_unawaken;
    while (count < runeClass) {
      html = html.concat(
        `<span class="star" style=" --left-rune-icon-stars: ${
          positionStarTable[count + 1]
        }px;"><img src="${isUpgradeMax ? starAwaken : starUnawaken}" /></span>`
      );
      count += 1;
    }

    return html.concat("</div>");
  },

  mountRuneListHtml(runes) {
    let message = '<div class="runes ui list relaxed">';

    runes.forEach((rune) => {
      message = message.concat(rune);
    });

    return message.concat("</div>");
  },

  displayInnerStat(rune) {
    if (rune.prefix_eff[0] === 0) {
      return "";
    }

    return `
      <div class="runeinnerstat">
        ${this.rune.effectTypesDisplay[rune.prefix_eff[0]]} +${
      rune.prefix_eff[1]
    }${this.displayPoucent(rune.prefix_eff[0])}
      </div>
    `;
  },

  mountRuneSubstats(rune, advice) {
    let substats = '<div class="rune-substats">';
    let currentProcs = Math.floor(
      rune.upgrade_curr > 12 ? 12 / 3 : rune.upgrade_curr / 3
    );
    let runeQuality = rune.extra > 10 ? rune.extra - 10 : rune.extra;
    let procsPerQuality = {
      0: [0, 0, 0, 0, 0],
      1: [0, 1, 1, 1, 1],
      2: [0, 1, 2, 2, 2],
      3: [0, 1, 2, 3, 3],
      4: [0, 1, 2, 3, 4],
    };
    let expectedProcs = procsPerQuality[currentProcs][runeQuality - 1];
    let calculatedProcs = 0;

    rune.sec_eff.forEach((substat) => {
      calculatedProcs += this.getSubstatsProcNumber(
        substat[0],
        substat[1],
        substat[2],
        rune.class
      );
      substats = substats.concat(`
          <div class="rune-substat-container">
            <div class="rune-substat">
              ${this.mountRuneSubstatProc(rune, substat)}
              <span class="substat-type">
                ${this.rune.effectTypesDisplay[substat[0]]}
              </span>
              ${this.mountRuneSubstatValue(substat)}                
            </div> 
            ${this.mountRuneProgressBar(rune, substat)}
          </div>
      `);
    });

    calculatedProcs < expectedProcs
      ? advice.push([
          "💵",
          `low proc (${calculatedProcs} out of ${expectedProcs}), you should sell or reap this rune !`,
        ])
      : "";

    return substats.concat("</div>");
  },

  mountRuneSubstatProc(rune, substat) {
    let bgColor = {
      gemmed: "#cfa755",
      proc: "#77825F",
      noproc: "#4d5159",
    };
    let fontColor = {
      proc: "#d0d4db",
      noproc: "#d0d4db",
    };

    let selectedColor = "";
    let selectedFontColor = "";
    let substatHtml = "";

    switch (true) {
      case substat[2] > 0:
        selectedColor = bgColor["gemmed"];
        substatHtml = `
        <span class="substat-gemmed" style="--color-bg-substat-proc: ${selectedColor}">
          <img src="${this.rune.content_url.gemmed_rune}" style="height: 12px; width: 12px;">
        </span>
      `;
        break;
      case this.getSubstatsProcNumber(
        substat[0],
        substat[1],
        substat[2],
        rune.class
      ) > 0:
        selectedColor = bgColor["proc"];
        selectedFontColor = fontColor["proc"];
        substatHtml = `
        <span class="substat-proc" style="--substat-proc: ${selectedColor}; --color-text-substat-proc: ${selectedFontColor};">${this.getSubstatsProcNumber(
          substat[0],
          substat[1],
          substat[2],
          rune.class
        )}</span>
      `;
        break;
      default:
        selectedColor = bgColor["noproc"];
        selectedFontColor = fontColor["noproc"];
        substatHtml = `
        <span class="substat-proc" style="--color-bg-substat-proc: ${selectedColor}; --color-text-substat-proc: ${selectedFontColor};">${this.getSubstatsProcNumber(
          substat[0],
          substat[1],
          substat[2],
          rune.class
        )}</span>
      `;
        break;
    }

    return substatHtml;
  },

  mountRuneSubstatValue(substat) {
    switch (true) {
      case substat[3] > 0:
        return `
          <span class="substat-value" style="--color-text-substat-value: #cfa755";>
            +${
              substat[3] > 0 ? substat[1] + substat[3] : substat[1]
            }${this.displayPoucent(substat[0])}
          </span>`;

      default:
        return `
          <span class="substat-value">
            +${
              substat[3] > 0 ? substat[1] + substat[3] : substat[1]
            }${this.displayPoucent(substat[0])}
          </span>`;
    }
  },

  mountRuneProgressBar(rune, substat) {
    let bgColor = {
      gemmed: "#cfa755",
      proc: "#77825F",
      noproc: "#4d5159",
    };
    let fontColor = {
      gemmed: "#d0d4db",
      proc: "#d0d4db",
      noproc: "#d0d4db",
    };

    let selectedColor = "";
    let selectedFontColor = "";

    switch (true) {
      case substat[2] > 0:
        selectedColor = bgColor["gemmed"];
        selectedFontColor = fontColor["gemmed"];
        break;
      case this.getSubstatsProcNumber(
        substat[0],
        substat[1],
        substat[2],
        rune.class
      ) > 0:
        selectedColor = bgColor["proc"];
        selectedFontColor = fontColor["proc"];
        break;
      default:
        selectedColor = bgColor["noproc"];
        selectedFontColor = fontColor["noproc"];
        break;
    }
    return `
      <div class="rune-progress-stat">
        <div class="before-progress-bar" style="--color-bg-substat-maxproc-value: ${selectedColor}; --color-text-substat-maxproc-value: ${selectedFontColor};">
        </div>
        <div class="progress-bar">
          <progress style="--color-fg-progressbar: ${selectedColor}" value="${this.getSubstatValuePercentage(
      substat[0],
      substat[1],
      substat[2],
      rune.class
    )}" max="100">
          </progress>
          <div class="progress-label">
            ${
              substat[1] ==
              this.getMaxProcValue(
                substat[0],
                substat[1],
                substat[2],
                rune.class
              )
                ? ""
                : substat[1]
            }
          </div>
        </div>
      </div>
      <div class="substat-proc-max-value" style="--color-bg-substat-maxproc-value: 
      ${
        substat[1] ==
        this.getMaxProcValue(substat[0], substat[1], substat[2], rune.class)
          ? selectedColor
          : "#383e48"
      }; --color-text-substat-maxproc-value: ${selectedFontColor};">
        ${this.getMaxProcValue(substat[0], substat[1], substat[2], rune.class)}
      </div>
      <div class="grind-container">
        ${this.mountGrindstones(
          substat,
          rune,
          selectedColor,
          selectedFontColor
        )}
      </div>
    `;
  },

  mountGrindstones(substat, rune, selectedColor, selectedFontColor) {
    let html = "";
    let grindableSubstats = [1, 2, 3, 4, 5, 6, 8];
    let grindablesubstat = grindableSubstats.includes(substat[0]);

    if (grindablesubstat && !gMapping.isAncient(rune)) {
      html = html.concat(`
      <div class="grindstone-value" style="--color-bg-grindstone: ${
        substat[3] === Number(this.grindstone[substat[0]].range[5].max)
          ? selectedColor
          : "#383e48"
      }">
        ${
          substat[3]
            ? substat[3] === Number(this.grindstone[substat[0]].range[5].max)
              ? ""
              : substat[3]
            : 0
        }
      </div>
      <div class="grindstone-proc-max-value" style="--color-bg-grindstone: ${selectedColor}; --color-text-grindstone: ${selectedFontColor};">
        ${this.grindstone[substat[0]].range[5].max}
      </div>
      `);
    } else if (grindablesubstat && gMapping.isAncient(rune)) {
      html = html.concat(`
        <div class="grindstone-value" style="--color-bg-grindstone: ${
          substat[3] ===
          Number(this.ancient_grindstone[substat[0]].range[15].max)
            ? selectedColor
            : "#383e48"
        }">
          ${
            substat[3]
              ? substat[3] ===
                Number(this.ancient_grindstone[substat[0]].range[15].max)
                ? ""
                : substat[3]
              : 0
          }
        </div>
        <div class="grindstone-proc-max-value" style="--color-bg-grindstone: ${selectedColor}; --color-text-grindstone: ${selectedFontColor};">
          ${this.ancient_grindstone[substat[0]].range[15].max}
        </div>
        `);
    } else {
      html = "";
    }
    return html;
  },

  displayPoucent(effectType) {
    return [2, 4, 6, 9, 10, 11, 12].includes(effectType) ? "%" : "";
  },

  // #region private runecard functions
  getSubstatsProcNumber(substatType, substatValue, isswapped, runeStars) {
    if (runeStars >= 10) {
      if (isswapped !== 1) {
        const substatMax =
          this.rune.ancient_increase_substat[substatType].range[runeStars].max;
        const ratio =
          (substatValue -
            this.rune.ancient_substat[substatType].base[runeStars]) /
          substatMax;
        return Math.floor(Number.isInteger(ratio) ? ratio : ratio + 1);
      } else {
        return 0;
      }
    } else {
      if (isswapped !== 1) {
        const substatMax =
          this.rune.increase_substat[substatType].range[runeStars].max;
        const ratio = (substatValue - substatMax) / substatMax;
        return Math.floor(Number.isInteger(ratio) ? ratio : ratio + 1);
      } else {
        return 0;
      }
    }
  },

  getMaxProcValue(substatType, substatValue, isswapped, runeStars) {
    if (runeStars >= 10) {
      if (isswapped !== 1) {
        let substatMax =
          this.rune.ancient_increase_substat[substatType].range[runeStars].max;
        let proc =
          this.getSubstatsProcNumber(
            substatType,
            substatValue,
            isswapped,
            runeStars
          ) || 0;
        let substatProcMax =
          substatMax * proc +
          this.rune.ancient_substat[substatType].base[runeStars];
        return `${substatProcMax}`;
      } else {
        return `${this.ancient_enchanted_gem[substatType].range[15].max}`;
      }
    } else {
      if (isswapped !== 1) {
        let substatMax =
          this.rune.increase_substat[substatType].range[runeStars].max;
        let proc =
          this.getSubstatsProcNumber(
            substatType,
            substatValue,
            isswapped,
            runeStars
          ) || 0;
        let substatProcMax = substatMax * (proc + 1);
        return `${substatProcMax}`;
      } else {
        return `${this.enchanted_gem[substatType].range[5].max}`;
      }
    }
  },

  getSubstatValuePercentage(substatType, substatValue, isswapped, runeStars) {
    if (runeStars >= 10) {
      let substatMax =
        this.rune.ancient_increase_substat[substatType].range[runeStars].max;
      let substatGrindMax =
        this.ancient_enchanted_gem[substatType].range[runeStars - 1].max;
      let proc =
        this.getSubstatsProcNumber(
          substatType,
          substatValue,
          isswapped,
          runeStars
        ) || 0;
      let substatProcMax =
        substatMax * proc +
        this.rune.ancient_substat[substatType].base[runeStars];

      return (
        (substatValue * 100) /
        (isswapped === 1 ? substatGrindMax : substatProcMax)
      );
    } else {
      let substatMax =
        this.rune.increase_substat[substatType].range[runeStars].max;
      let substatGrindMax =
        this.enchanted_gem[substatType].range[runeStars - 1].max;
      let proc =
        this.getSubstatsProcNumber(
          substatType,
          substatValue,
          isswapped,
          runeStars
        ) || 0;
      let substatProcMax = substatMax * (proc + 1);

      return (
        (substatValue * 100) /
        (isswapped === 1 ? substatGrindMax : substatProcMax)
      );
    }
  },

  getRuneEfficiency(rune, toFixed = 2) {
    let ratio = 0.0;

    ratio +=
      this.rune.mainstat[rune.pri_eff[0]].max[
        gMapping.isAncient(rune) ? rune.class - 10 : rune.class
      ] / this.rune.mainstat[rune.pri_eff[0]].max[6];

    let grindPotential = 0;

    // substats
    if (gMapping.isAncient(rune)) {
      rune.sec_eff.forEach((stat) => {
        let value = stat[3] && stat[3] > 0 ? stat[1] + stat[3] : stat[1];
        ratio += value / this.rune.ancient_substat[stat[0]].max[16];

        if (this.ancient_grindstone[stat[0]]?.range[15].max) {
          let possibleGrindValue =
            this.ancient_grindstone[stat[0]]?.range[15].max -
            (stat[3] ? stat[3] : 0);
          grindPotential +=
            possibleGrindValue / this.rune.ancient_substat[stat[0]].max[16];
        }
      });
    } else {
      rune.sec_eff.forEach((stat) => {
        let value = stat[3] && stat[3] > 0 ? stat[1] + stat[3] : stat[1];
        ratio += value / this.rune.substat[stat[0]].max[6];

        if (this.grindstone[stat[0]]?.range[5].max) {
          let possibleGrindValue =
            this.grindstone[stat[0]]?.range[5].max - (stat[3] ? stat[3] : 0);
          grindPotential +=
            possibleGrindValue / this.rune.substat[stat[0]].max[6];
        }
      });
    }

    // innate stat
    if (rune.prefix_eff && rune.prefix_eff[0] > 0) {
      ratio +=
        rune.prefix_eff[1] / this.rune.substat[rune.prefix_eff[0]].max[6];
    }

    let efficiency = (ratio / 2.8) * 100;
    let maxPotential =
      efficiency +
      ((Math.max(Math.ceil((12 - rune.upgrade_curr) / 3.0), 0) * 0.2) / 2.8) *
        100;
    let maxWithGrind = maxPotential + (grindPotential / 2.8) * 100;

    return {
      current: efficiency.toFixed(toFixed),
      max: maxPotential.toFixed(toFixed),
      maxWithGrind: maxWithGrind.toFixed(toFixed),
    };
  },

  // #endregion

  // #region mapping
  rune: {
    slot_url: {
      1: "https://i.imgur.com/pbdoiOc.png",
      2: "https://i.imgur.com/W8brTq5.png",
      3: "https://i.imgur.com/KtTo1wk.png",
      4: "https://i.imgur.com/siIqTPr.png",
      5: "https://i.imgur.com/n2x2PZW.png",
      6: "https://i.imgur.com/CI4jy2u.png",
    },
    content_url: {
      ancient_icon: "https://i.imgur.com/ztMIYtV.png",
      gemmed_rune: "https://i.imgur.com/6BOueJ1.png",
      runecard_background: "https://i.imgur.com/l2ucSyE.png",
      star_awaken: "https://i.imgur.com/5HkmbJV.png",
      star_unawaken: "https://i.imgur.com/Wdx6Cn5.png",
      rainbowmon: "https://i.imgur.com/nUcfMQt.png",
    },
    effectTypes: {
      0: "",
      1: "HP flat",
      2: "HP%",
      3: "ATK flat",
      4: "ATK%",
      5: "DEF flat",
      6: "DEF%",
      8: "SPD",
      9: "CRate",
      10: "CDmg",
      11: "RES",
      12: "ACC",
    },
    effectTypesDisplay: {
      0: "",
      1: "HP",
      2: "HP",
      3: "ATK",
      4: "ATK",
      5: "DEF",
      6: "DEF",
      8: "SPD",
      9: "CRI Rate",
      10: "CRI Dmg",
      11: "Resistance",
      12: "Accuracy",
    },
    sets: {
      1: "Energy",
      2: "Guard",
      3: "Swift",
      4: "Blade",
      5: "Rage",
      6: "Focus",
      7: "Endure",
      8: "Fatal",
      10: "Despair",
      11: "Vampire",
      13: "Violent",
      14: "Nemesis",
      15: "Will",
      16: "Shield",
      17: "Revenge",
      18: "Destroy",
      19: "Fight",
      20: "Determination",
      21: "Enhance",
      22: "Accuracy",
      23: "Tolerance",
      24: "Seal",
      25: "Intangible",
      99: "Immemorial",
    },
    set_bonuses: {
      1: ["2", "HP +15%"],
      2: ["2", "Defense +15%"],
      3: ["4", "Attack Speed +25%"],
      4: ["2", "Critical Rate +12%"],
      5: ["4", "Critical Damage +40%"],
      6: ["2", "Accuracy +20%"],
      7: ["2", "Resistance +20%"],
      8: ["4", "Attack Power +35%"],
      10: ["4", "Stun Rate +25%"],
      11: ["4", "Life Drain +35%"],
      13: ["4", "Get Extra Turn +22%"],
      14: ["2", "ATK Gauge +4% (for every 7% HP lost)"],
      15: ["2", "Immunity +1 turn"],
      16: ["2", "Ally Shield 3 turns (15% of HP)"],
      17: ["2", "Counterattack +15%"],
      18: [
        "2",
        "30% of the damage dealt will reduce up to 4% of the enemy's Max HP",
      ],
      19: ["2", "Increase the Attack Power of all allies by 7%"],
      20: ["2", "Increase the Defense of all allies by 7%"],
      21: ["2", "Increase the HP of all allies by 7%"],
      22: ["2", "Increase the Accuracy of all allies by 10%"],
      23: ["2", "Increase the Resistance of all allies by 10%"],
      24: ["2", "Seal effect on enemy with 15% chance"],
      25: ["1", ""],
    },
    class: {
      0: "Common",
      1: "Magic",
      2: "Rare",
      3: "Hero",
      4: "Legendary",
      // ancient rune classes
      10: "Common",
      11: "Magic",
      12: "Rare",
      13: "Hero",
      14: "Legendary",
    },
    quality: {
      1: "Common",
      2: "Magic",
      3: "Rare",
      4: "Hero",
      5: "Legend",
      // ancient rune qualities
      11: "Common",
      12: "Magic",
      13: "Rare",
      14: "Hero",
      15: "Legend",
    },
    mainstat: {
      1: {
        max: {
          1: 804,
          2: 1092,
          3: 1380,
          4: 1704,
          5: 2088,
          6: 2448,
        },
      },
      2: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 43,
          5: 51,
          6: 63,
        },
      },
      3: {
        max: {
          1: 54,
          2: 74,
          3: 93,
          4: 113,
          5: 135,
          6: 160,
        },
      },
      4: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 43,
          5: 51,
          6: 63,
        },
      },
      5: {
        max: {
          1: 54,
          2: 74,
          3: 93,
          4: 113,
          5: 135,
          6: 160,
        },
      },
      6: {
        // Defense
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 43,
          5: 51,
          6: 63,
        },
      },
      8: {
        max: {
          1: 18,
          2: 19,
          3: 25,
          4: 30,
          5: 39,
          6: 42,
        },
      },
      9: {
        max: {
          1: 18,
          2: 20,
          3: 37,
          4: 41,
          5: 47,
          6: 58,
        },
      },
      10: {
        max: {
          1: 20,
          2: 37,
          3: 43,
          4: 58,
          5: 65,
          6: 80,
        },
      },
      11: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 44,
          5: 51,
          6: 64,
        },
      },
      12: {
        max: {
          1: 18,
          2: 20,
          3: 38,
          4: 44,
          5: 51,
          6: 64,
        },
      },
    },
    substat: {
      1: {
        max: {
          1: 300,
          2: 525,
          3: 825,
          4: 1125,
          5: 1500,
          6: 1875,
        },
      },
      2: {
        max: {
          1: 10,
          2: 15,
          3: 25,
          4: 30,
          5: 35,
          6: 40,
        },
      },
      3: {
        max: {
          1: 20,
          2: 25,
          3: 40,
          4: 50,
          5: 75,
          6: 100,
        },
      },
      4: {
        max: {
          1: 10,
          2: 15,
          3: 25,
          4: 30,
          5: 35,
          6: 40,
        },
      },
      5: {
        max: {
          1: 20,
          2: 25,
          3: 40,
          4: 50,
          5: 75,
          6: 100,
        },
      },
      6: {
        max: {
          1: 10,
          2: 15,
          3: 25,
          4: 30,
          5: 35,
          6: 40,
        },
      },
      8: {
        max: {
          1: 5,
          2: 10,
          3: 15,
          4: 20,
          5: 25,
          6: 30,
        },
      },
      9: {
        max: {
          1: 5,
          2: 10,
          3: 15,
          4: 20,
          5: 25,
          6: 30,
        },
      },
      10: {
        max: {
          1: 10,
          2: 15,
          3: 20,
          4: 25,
          5: 25,
          6: 35,
        },
      },
      11: {
        max: {
          1: 10,
          2: 15,
          3: 20,
          4: 25,
          5: 35,
          6: 40,
        },
      },
      12: {
        max: {
          1: 10,
          2: 15,
          3: 20,
          4: 25,
          5: 35,
          6: 40,
        },
      },
    },
    increase_substat: {
      1: {
        range: {
          1: { min: 15, max: 60 },
          2: { min: 30, max: 105 },
          3: { min: 45, max: 165 },
          4: { min: 60, max: 225 },
          5: { min: 90, max: 300 },
          6: { min: 135, max: 375 },
        },
      },
      2: {
        range: {
          1: { min: 1, max: 2 },
          2: { min: 1, max: 3 },
          3: { min: 2, max: 5 },
          4: { min: 3, max: 6 },
          5: { min: 4, max: 7 },
          6: { min: 5, max: 8 },
        },
      },
      3: {
        range: {
          1: { min: 1, max: 4 },
          2: { min: 2, max: 5 },
          3: { min: 3, max: 8 },
          4: { min: 4, max: 10 },
          5: { min: 8, max: 15 },
          6: { min: 10, max: 20 },
        },
      },
      4: {
        range: {
          1: { min: 1, max: 2 },
          2: { min: 1, max: 3 },
          3: { min: 2, max: 5 },
          4: { min: 3, max: 6 },
          5: { min: 4, max: 7 },
          6: { min: 5, max: 8 },
        },
      },
      5: {
        range: {
          1: { min: 1, max: 4 },
          2: { min: 2, max: 5 },
          3: { min: 3, max: 8 },
          4: { min: 4, max: 10 },
          5: { min: 8, max: 15 },
          6: { min: 10, max: 20 },
        },
      },
      6: {
        range: {
          1: { min: 1, max: 2 },
          2: { min: 1, max: 3 },
          3: { min: 2, max: 5 },
          4: { min: 3, max: 6 },
          5: { min: 4, max: 7 },
          6: { min: 5, max: 8 },
        },
      },
      8: {
        range: {
          1: { min: 1, max: 1 },
          2: { min: 1, max: 2 },
          3: { min: 1, max: 3 },
          4: { min: 2, max: 4 },
          5: { min: 3, max: 5 },
          6: { min: 4, max: 6 },
        },
      },
      9: {
        range: {
          1: { min: 1, max: 1 },
          2: { min: 1, max: 2 },
          3: { min: 1, max: 3 },
          4: { min: 2, max: 4 },
          5: { min: 3, max: 5 },
          6: { min: 4, max: 6 },
        },
      },
      10: {
        range: {
          1: { min: 1, max: 2 },
          2: { min: 1, max: 3 },
          3: { min: 2, max: 4 },
          4: { min: 2, max: 5 },
          5: { min: 3, max: 5 },
          6: { min: 4, max: 7 },
        },
      },
      11: {
        range: {
          1: { min: 1, max: 2 },
          2: { min: 1, max: 3 },
          3: { min: 2, max: 4 },
          4: { min: 2, max: 5 },
          5: { min: 3, max: 7 },
          6: { min: 4, max: 8 },
        },
      },
      12: {
        range: {
          1: { min: 1, max: 2 },
          2: { min: 1, max: 3 },
          3: { min: 2, max: 4 },
          4: { min: 2, max: 5 },
          5: { min: 3, max: 7 },
          6: { min: 4, max: 8 },
        },
      },
    },
    ancient_substat: {
      1: {
        base: {
          11: 120,
          12: 165,
          13: 225,
          14: 285,
          15: 360,
          16: 435,
        },
        max: {
          11: 360,
          12: 585,
          13: 885,
          14: 1185,
          15: 1560,
          16: 1935,
        },
      },
      2: {
        base: {
          11: 4,
          12: 5,
          13: 7,
          14: 8,
          15: 9,
          16: 10,
        },
        max: {
          11: 12,
          12: 17,
          13: 27,
          14: 32,
          15: 37,
          16: 42,
        },
      },
      3: {
        base: {
          11: 8,
          12: 9,
          13: 12,
          14: 14,
          15: 19,
          16: 24,
        },
        max: {
          11: 24,
          12: 29,
          13: 44,
          14: 54,
          15: 79,
          16: 104,
        },
      },
      4: {
        base: {
          11: 4,
          12: 5,
          13: 7,
          14: 8,
          15: 9,
          16: 10,
        },
        max: {
          11: 12,
          12: 17,
          13: 27,
          14: 32,
          15: 37,
          16: 42,
        },
      },
      5: {
        base: {
          11: 8,
          12: 9,
          13: 12,
          14: 14,
          15: 19,
          16: 24,
        },
        max: {
          11: 24,
          12: 29,
          13: 44,
          14: 54,
          15: 79,
          16: 104,
        },
      },
      6: {
        base: {
          11: 4,
          12: 5,
          13: 7,
          14: 8,
          15: 9,
          16: 10,
        },
        max: {
          11: 12,
          12: 17,
          13: 27,
          14: 32,
          15: 37,
          16: 42,
        },
      },
      8: {
        base: {
          11: 2,
          12: 3,
          13: 4,
          14: 5,
          15: 6,
          16: 7,
        },
        max: {
          11: 6,
          12: 11,
          13: 16,
          14: 21,
          15: 26,
          16: 31,
        },
      },
      9: {
        base: {
          11: 2,
          12: 3,
          13: 4,
          14: 5,
          15: 6,
          16: 7,
        },
        max: {
          11: 6,
          12: 11,
          13: 16,
          14: 21,
          15: 26,
          16: 31,
        },
      },
      10: {
        base: {
          11: 4,
          12: 5,
          13: 6,
          14: 7,
          15: 7,
          16: 9,
        },
        max: {
          11: 12,
          12: 17,
          13: 22,
          14: 27,
          15: 27,
          16: 37,
        },
      },
      11: {
        base: {
          11: 4,
          12: 5,
          13: 6,
          14: 7,
          15: 9,
          16: 10,
        },
        max: {
          11: 12,
          12: 17,
          13: 22,
          14: 27,
          15: 37,
          16: 42,
        },
      },
      12: {
        base: {
          11: 4,
          12: 5,
          13: 6,
          14: 7,
          15: 9,
          16: 10,
        },
        max: {
          11: 12,
          12: 17,
          13: 22,
          14: 27,
          15: 37,
          16: 42,
        },
      },
    },
    ancient_increase_substat: {
      1: {
        range: {
          11: { min: 15, max: 60 },
          12: { min: 30, max: 105 },
          13: { min: 45, max: 165 },
          14: { min: 60, max: 225 },
          15: { min: 90, max: 300 },
          16: { min: 135, max: 375 },
        },
      },
      2: {
        range: {
          11: { min: 1, max: 2 },
          12: { min: 1, max: 3 },
          13: { min: 2, max: 5 },
          14: { min: 3, max: 6 },
          15: { min: 4, max: 7 },
          16: { min: 5, max: 8 },
        },
      },
      3: {
        range: {
          11: { min: 1, max: 4 },
          12: { min: 2, max: 5 },
          13: { min: 3, max: 8 },
          14: { min: 4, max: 10 },
          15: { min: 8, max: 15 },
          16: { min: 10, max: 20 },
        },
      },
      4: {
        range: {
          11: { min: 1, max: 2 },
          12: { min: 1, max: 3 },
          13: { min: 2, max: 5 },
          14: { min: 3, max: 6 },
          15: { min: 4, max: 7 },
          16: { min: 5, max: 8 },
        },
      },
      5: {
        range: {
          11: { min: 1, max: 4 },
          12: { min: 2, max: 5 },
          13: { min: 3, max: 8 },
          14: { min: 4, max: 10 },
          15: { min: 8, max: 15 },
          16: { min: 10, max: 20 },
        },
      },
      6: {
        range: {
          11: { min: 1, max: 2 },
          12: { min: 1, max: 3 },
          13: { min: 2, max: 5 },
          14: { min: 3, max: 6 },
          15: { min: 4, max: 7 },
          16: { min: 5, max: 8 },
        },
      },
      8: {
        range: {
          11: { min: 1, max: 1 },
          12: { min: 1, max: 2 },
          13: { min: 1, max: 3 },
          14: { min: 2, max: 4 },
          15: { min: 3, max: 5 },
          16: { min: 4, max: 6 },
        },
      },
      9: {
        range: {
          11: { min: 1, max: 1 },
          12: { min: 1, max: 2 },
          13: { min: 1, max: 3 },
          14: { min: 2, max: 4 },
          15: { min: 3, max: 5 },
          16: { min: 4, max: 6 },
        },
      },
      10: {
        range: {
          11: { min: 1, max: 2 },
          12: { min: 1, max: 3 },
          13: { min: 2, max: 4 },
          14: { min: 2, max: 5 },
          15: { min: 3, max: 5 },
          16: { min: 4, max: 7 },
        },
      },
      11: {
        range: {
          11: { min: 1, max: 2 },
          12: { min: 1, max: 3 },
          13: { min: 2, max: 4 },
          14: { min: 2, max: 5 },
          15: { min: 3, max: 7 },
          16: { min: 4, max: 8 },
        },
      },
      12: {
        range: {
          11: { min: 1, max: 2 },
          12: { min: 1, max: 3 },
          13: { min: 2, max: 4 },
          14: { min: 2, max: 5 },
          15: { min: 3, max: 7 },
          16: { min: 4, max: 8 },
        },
      },
    },
  },

  grindstone: {
    1: {
      range: {
        1: { min: 80, max: 120 },
        2: { min: 100, max: 200 },
        3: { min: 180, max: 250 },
        4: { min: 230, max: 450 },
        5: { min: 430, max: 550 },
      },
    },
    2: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 5 },
        3: { min: 3, max: 6 },
        4: { min: 4, max: 7 },
        5: { min: 5, max: 10 },
      },
    },
    3: {
      range: {
        1: { min: 4, max: 8 },
        2: { min: 6, max: 12 },
        3: { min: 10, max: 18 },
        4: { min: 12, max: 22 },
        5: { min: 18, max: 30 },
      },
    },
    4: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 5 },
        3: { min: 3, max: 6 },
        4: { min: 4, max: 7 },
        5: { min: 5, max: 10 },
      },
    },
    5: {
      range: {
        1: { min: 4, max: 8 },
        2: { min: 6, max: 12 },
        3: { min: 10, max: 18 },
        4: { min: 12, max: 22 },
        5: { min: 18, max: 30 },
      },
    },
    6: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 5 },
        3: { min: 3, max: 6 },
        4: { min: 4, max: 7 },
        5: { min: 5, max: 10 },
      },
    },
    8: {
      range: {
        1: { min: 1, max: 2 },
        2: { min: 1, max: 2 },
        3: { min: 2, max: 3 },
        4: { min: 3, max: 4 },
        5: { min: 4, max: 5 },
      },
    },
  },

  ancient_grindstone: {
    1: {
      range: {
        11: { min: 80, max: 180 },
        12: { min: 100, max: 260 },
        13: { min: 180, max: 310 },
        14: { min: 230, max: 510 },
        15: { min: 430, max: 610 },
      },
    },
    2: {
      range: {
        11: { min: 1, max: 5 },
        12: { min: 2, max: 7 },
        13: { min: 3, max: 8 },
        14: { min: 4, max: 9 },
        15: { min: 5, max: 12 },
      },
    },
    3: {
      range: {
        11: { min: 4, max: 12 },
        12: { min: 6, max: 16 },
        13: { min: 10, max: 22 },
        14: { min: 12, max: 26 },
        15: { min: 18, max: 34 },
      },
    },
    4: {
      range: {
        11: { min: 1, max: 5 },
        12: { min: 2, max: 7 },
        13: { min: 3, max: 8 },
        14: { min: 4, max: 9 },
        15: { min: 5, max: 12 },
      },
    },
    5: {
      range: {
        11: { min: 4, max: 12 },
        12: { min: 6, max: 16 },
        13: { min: 10, max: 22 },
        14: { min: 12, max: 26 },
        15: { min: 18, max: 34 },
      },
    },
    6: {
      range: {
        11: { min: 1, max: 5 },
        12: { min: 2, max: 7 },
        13: { min: 3, max: 8 },
        14: { min: 4, max: 9 },
        15: { min: 5, max: 12 },
      },
    },
    8: {
      range: {
        11: { min: 1, max: 1 },
        12: { min: 1, max: 3 },
        13: { min: 2, max: 4 },
        14: { min: 3, max: 5 },
        15: { min: 4, max: 6 },
      },
    },
  },

  enchanted_gem: {
    1: {
      range: {
        1: { min: 100, max: 150 },
        2: { min: 130, max: 220 },
        3: { min: 200, max: 310 },
        4: { min: 290, max: 420 },
        5: { min: 400, max: 580 },
      },
    },
    2: {
      range: {
        1: { min: 2, max: 4 },
        2: { min: 3, max: 7 },
        3: { min: 5, max: 9 },
        4: { min: 7, max: 11 },
        5: { min: 9, max: 13 },
      },
    },
    3: {
      range: {
        1: { min: 8, max: 12 },
        2: { min: 10, max: 16 },
        3: { min: 15, max: 23 },
        4: { min: 20, max: 30 },
        5: { min: 28, max: 40 },
      },
    },
    4: {
      range: {
        1: { min: 2, max: 4 },
        2: { min: 3, max: 7 },
        3: { min: 5, max: 9 },
        4: { min: 7, max: 11 },
        5: { min: 9, max: 13 },
      },
    },
    5: {
      range: {
        1: { min: 8, max: 12 },
        2: { min: 10, max: 16 },
        3: { min: 15, max: 23 },
        4: { min: 20, max: 30 },
        5: { min: 28, max: 40 },
      },
    },
    6: {
      range: {
        1: { min: 2, max: 4 },
        2: { min: 3, max: 7 },
        3: { min: 5, max: 9 },
        4: { min: 7, max: 11 },
        5: { min: 9, max: 13 },
      },
    },
    8: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 4 },
        3: { min: 3, max: 6 },
        4: { min: 5, max: 8 },
        5: { min: 7, max: 10 },
      },
    },
    9: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 2, max: 4 },
        3: { min: 3, max: 5 },
        4: { min: 4, max: 7 },
        5: { min: 6, max: 9 },
      },
    },
    10: {
      range: {
        1: { min: 1, max: 3 },
        2: { min: 3, max: 5 },
        3: { min: 4, max: 6 },
        4: { min: 5, max: 8 },
        5: { min: 7, max: 10 },
      },
    },
    11: {
      range: {
        1: { min: 2, max: 4 },
        2: { min: 3, max: 6 },
        3: { min: 5, max: 8 },
        4: { min: 6, max: 9 },
        5: { min: 8, max: 11 },
      },
    },
    12: {
      range: {
        1: { min: 2, max: 4 },
        2: { min: 3, max: 6 },
        3: { min: 5, max: 8 },
        4: { min: 6, max: 9 },
        5: { min: 8, max: 11 },
      },
    },
  },

  ancient_enchanted_gem: {
    1: {
      range: {
        11: { min: 100, max: 210 },
        12: { min: 130, max: 280 },
        13: { min: 200, max: 370 },
        14: { min: 290, max: 480 },
        15: { min: 400, max: 640 },
      },
    },
    2: {
      range: {
        11: { min: 2, max: 6 },
        12: { min: 3, max: 9 },
        13: { min: 5, max: 11 },
        14: { min: 7, max: 13 },
        15: { min: 9, max: 15 },
      },
    },
    3: {
      range: {
        11: { min: 8, max: 16 },
        12: { min: 10, max: 20 },
        13: { min: 15, max: 27 },
        14: { min: 20, max: 34 },
        15: { min: 28, max: 44 },
      },
    },
    4: {
      range: {
        11: { min: 2, max: 6 },
        12: { min: 3, max: 9 },
        13: { min: 5, max: 11 },
        14: { min: 7, max: 13 },
        15: { min: 9, max: 15 },
      },
    },
    5: {
      range: {
        11: { min: 8, max: 16 },
        12: { min: 10, max: 20 },
        13: { min: 15, max: 27 },
        14: { min: 20, max: 34 },
        15: { min: 28, max: 44 },
      },
    },
    6: {
      range: {
        11: { min: 2, max: 6 },
        12: { min: 3, max: 9 },
        13: { min: 5, max: 11 },
        14: { min: 7, max: 13 },
        15: { min: 9, max: 15 },
      },
    },
    8: {
      range: {
        11: { min: 1, max: 4 },
        12: { min: 2, max: 5 },
        13: { min: 3, max: 7 },
        14: { min: 5, max: 9 },
        15: { min: 7, max: 11 },
      },
    },
    9: {
      range: {
        11: { min: 1, max: 4 },
        12: { min: 2, max: 5 },
        13: { min: 3, max: 6 },
        14: { min: 4, max: 8 },
        15: { min: 6, max: 10 },
      },
    },
    10: {
      range: {
        11: { min: 1, max: 5 },
        12: { min: 3, max: 7 },
        13: { min: 4, max: 8 },
        14: { min: 5, max: 10 },
        15: { min: 7, max: 12 },
      },
    },
    11: {
      range: {
        11: { min: 2, max: 6 },
        12: { min: 3, max: 8 },
        13: { min: 5, max: 10 },
        14: { min: 6, max: 11 },
        15: { min: 8, max: 13 },
      },
    },
    12: {
      range: {
        11: { min: 2, max: 6 },
        12: { min: 3, max: 8 },
        13: { min: 5, max: 10 },
        14: { min: 6, max: 11 },
        15: { min: 8, max: 13 },
      },
    },
  },
  // #endregion

  // #region scope css
  getScopeCss() {
    return `
    @import url('https://fonts.googleapis.com/css2?family=Lato&family=Roboto&family=Bebas+Neue&family=Oswald&display=swap');

              :root{
                  --color-bg-rune-card: #2a2e36;
                  --color-text-rune-card: #ffffff;
                  --color-bg-rune-upgrade: rgba(0, 0, 0, 0.5);
                  --left-rune-icon-stars: 0;
                  --top-rune-icon-set: 0;
                  --left-rune-icon-set: 0;
                  --color-text-substat-type: #8b93a4;
                  --color-bg-substat-proc: #77825F;
                  --color-text-substat-proc: #25180e;
                  --color-text-substat-value: #d0d4db;
                  --color-bg-substat-maxproc-value: #383e48;
                  --color-text-substat-maxproc-value: #d0d4db;
                  --color-bg-progressbar:#2e333b;
                  --color-fg-progressbar:#77825F;
                  --color-border-progressbar:#383e48;
                  --color-text-progressbar-label:#d0d4db;
                  --color-bg-grindstone: #2e333b;
                  --color-text-grindstone: #2e333b;
                  --color-text-footer: #77825F;
                }
                
                .rune-card {
                  background-color: var(--color-bg-rune-card);
                  border-radius: 10px;
                  max-width: 380px;
                  padding: 10px;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  align-items: left;
                  color: var(--color-text-rune-card);
                  margin: 0 0 5px 0;
                  box-shadow: rgba(50, 50, 93, 0.25) 0 6px 12px -2px, rgba(0, 0, 0, 0.3) 0 3px 7px -3px;
                }
                
                .rune-card .rune-content .rune-content-container {
                  display: flex;
                  flex-direction: row;
                  min-width: 340px;
                  justify-content: space-between;
                  border-radius: 5px;
                  animation: animatedBackground 30s linear infinite;
                }
                
                @keyframes animatedBackground {
                  0% { background-position: 0 0; }
                  50% { background-position: 0 100%; }
                  100% { background-position: 0 0; }
                }
                
                .rune-card .rune-content .rune-content-container .rune-icon {
                  position: relative;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 78px;
                  border-radius: 5px;
                  padding: 0 2px 0 25px;
                  flex-grow: 0;
                  flex-shrink: 0;
                  flex-basis: auto;
                  min-width: 80px;
                  animation: moveUpDown 2s linear infinite;
                }
                
                @keyframes moveUpDown {
                  0%, 100% { transform: translateY(-2px); }
                  50% { transform: translateY(2px); }
                }
                
                .rune-card .rune-content .rune-content-container .halo {
                  position: absolute;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 78px;
                  border-radius: 5px;
                  left: 37px;
                  flex-grow: 0; 
                  flex-shrink: 0; 
                  flex-basis: auto; 
                  min-width: 80px; 
                  background: radial-gradient(rgba(255,255,255,1), rgba(255,255,255,0.6), rgba(255,255,255,0), rgba(255,255,255,0));
                  animation: haloFadeInOut 2s linear infinite;
                }
                
                @keyframes haloFadeInOut {
                  0% {opacity: 1;}
                  50% {opacity: 0;}
                  100% {opacity: 1;}
                }
                
                .rune-card .rune-content .rune-content-container .rune-stars .star-line .star img {
                  position: absolute;
                  width: 20px;
                  top: 0;
                  left: var(--left-rune-icon-stars);
                }
                
                .rune-card .rune-content .rune-content-container {
                  margin: 0 0 5px 0;
                }
                
                .rune-card .rune-content .rune-content-container img {
                  width: 70px;
                }
                
                .rune-card .rune-content .rune-content-container .rune-icon .slot {
                  position: absolute;
                }
                
                .rune-card .rune-content .rune-content-container .rune-icon .set {
                  position: absolute;
                  width: 30px;
                  top: var(--top-rune-icon-set);
                  left: var(--left-rune-icon-set);
                }
                
                .rune-card .rune-content .rune-content-container .rune-left-info {
                  position: relative;
                }
                
                .rune-card .rune-content .rune-content-container .rune-left-info span.upgrade {
                  background: var(--color-bg-rune-upgrade);
                  border-radius: 0 5px 0 5px;
                  bottom: 0;
                  text-align: center;
                  position: absolute;
                  left: 0;
                  width: 20px;
                  height: 12px;
                  font-size: 10px;
                  padding: 0 3px 16px 0;
                }
                
                .rune-card .rune-content .rune-content-container .rune-left-info span.ancient {
                  border-radius: 5px 0 100% 0;
                  top: 3px;
                  text-align: center;
                  position: absolute;
                  left: 0;
                  width: 20px;
                  height: 12px;
                  font-size: 10px;
                  padding: 0 0 16px 0;
                }
                
                .rune-card .rune-content .rune-content-container .rune-left-info img.ancient {
                  width: 20px;
                }
                
                .rune-card .rune-content .rune-content-container .rune-primary-stats {
                  display: flex;
                  margin: 10px;
                  flex-grow: 1;
                  flex-shrink: 1; 
                  flex-basis: auto; 
                }
                
                .rune-primary-stats-container {
                  display: flex;
                  flex-direction: column;
                }
                
                .rune-primary-stats-container .rune-stars {
                  position: relative;
                  min-height: 18px;
                  font-size: 14px;
                }
                
                .rune-primary-stats-container .rune-stars .star-line .star img {
                  position: absolute;
                  width: 20px;
                  top: 0;
                  left: var(--left-rune-icon-stars);
                }
                
                .rune-primary-stats-container .rune-main-stat {
                  display: flex;
                  flex: 1;
                  margin: 5px 0 0 0;
                  font-size: 20px;
                  font-weight: bold;
                  text-shadow: -1px -1px 1px rgba(255,255,255,.1), 1px 1px 1px rgba(0,0,0,.8);
                  font-family: 'Roboto', sans-serif;
                }
                
                .rune-primary-stats-container .rune-inner-stat {
                  display: flex;
                  flex: 1;
                  font-size: 14px;
                  text-shadow: -1px -1px 1px rgba(255,255,255,.1), 1px 1px 1px rgba(0,0,0,.8);
                  font-family: 'Roboto', sans-serif;
                }
                
                .rune-card .rune-content .rune-content-container .rune-efficiencies {
                  display: flex;
                  margin: 10px 10px 10px 0;
                  flex-grow: 0; 
                  flex-shrink: 0; 
                  flex-basis: auto; 
                  min-width: 85px; 
                  justify-content: flex-end;
                }
                
                .rune-efficiencies-container {
                  display: flex;
                  flex-direction: column;
                }
                
                .rune-efficiencies-container .rune-efficiency-max {
                  display: flex;
                  font-size: 12px;
                  justify-content: right;
                  text-shadow: -1px -1px 1px rgba(255,255,255,.1), 1px 1px 1px rgba(0,0,0,.8);
                  font-family: 'Roboto', sans-serif;
                }
                
                .rune-efficiencies-container .rune-efficiency-max span {
                  border-radius: 5px;
                  padding: 0 4px 0 4px;
                }
                
                .rune-efficiencies-container .spacer {
                  display: flex;
                  min-height: 16px;
                  font-size: 12px;
                  justify-content: right;
                }
                
                .rune-efficiencies-container .rune-efficiency {
                  display: flex;
                  font-size: 36px;
                  font-weight: bold;
                  justify-content: right;
                  text-shadow: -1px -1px 1px rgba(255,255,255,.1), 1px 1px 1px rgba(0,0,0,.8);
                  font-family: 'Bebas Neue', sans-serif;
                }
                
                .rune-substats {
                  margin: 5px 0 0 0;
                  display: flex;
                  flex-direction: column;
                }
                
                .rune-substat-container {
                  margin: 5px 0 0 0;
                  display: flex;
                  flex-direction: row;
                }
                
                .rune-substat {
                  display: flex;
                  flex: 2;
                  align-items: center;
                  width: 30px;
                }
                
                .substat-type {
                  color: var(--color-text-substat-type);
                  white-space: nowrap;
                }
                
                .substat-proc {
                  padding: 0 5px 0 5px;
                  margin: 0 5px 0 0;
                  background-color: var(--color-bg-substat-proc);
                  border-radius: 5px;
                  color: var(--color-text-substat-proc);
                  font-weight: bold;
                }
                
                .substat-gemmed {
                  padding: 2px 3px 0 3px;
                  margin: 0 5px 0 0;
                  background-color: var(--color-bg-substat-proc);
                  border-radius: 5px;
                }
                
                .footer {
                  margin: 10px 0 0 0;
                  display: flex;
                  justify-content: center;
                  color: var(--color-text-footer);
                }

                // .footer img{
                //   animation: moveUpDown2 3s linear infinite;
                // }

                // @keyframes moveUpDown2 {
                //   0%, 100% { transform: translateY(2px); }
                //   50% { transform: translateY(-2px); }
                // }
                
                .progress-bar {
                  position: relative;
                  width: 80px;
                  height: 22px;
                }
                
                .progress-bar progress {
                  border: solid var(--color-border-progressbar);
                  border-width: 1px 0 1px 0;
                  width: 80px;
                  height: 22px;
                }
                .progress-bar progress::-webkit-progress-bar {
                  background-color: var(--color-bg-progressbar);
                }
                .progress-bar progress::-webkit-progress-value {
                  background-color: var(--color-fg-progressbar);
                }
                
                .progress-bar .progress-label {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  text-align: center;
                  line-height: 22px; 
                  color: var(--color-text-progressbar-label); 
                }
                
                .rune-progress-stat {
                  display: flex;
                  flex: 5;
                  align-items: center;
                  justify-content: right;
                  width: 210px;
                }
                
                .before-progress-bar{
                  padding: 2px 2px 0 2px;
                  background-color: #383e48;
                  border-radius: 5px 0 0 5px;
                  color: var(--color-text-substat-maxproc-value);
                  font-weight: bold;
                  width: 20px;
                  height: 22px;
                }
                
                .substat-value {
                  margin: 0 0 0 5px;
                  color: var(--color-text-substat-value);
                }
                
                .substat-proc-max-value {
                  border: solid #383e48;
                  border-width: 1px 1px 1px 0;
                  padding: 1px 5px 0 0;
                  background-color: var(--color-bg-substat-maxproc-value);
                  border-radius: 0 5px 5px 0;
                  color: var(--color-text-substat-maxproc-value);
                  font-weight: bold;
                  width: 42px;
                  height: 22px;
                  text-align: right;
                }
                
                .grind-container {
                  display: flex;
                  min-width: 70px;
                  margin: 0 0 0 10px;
                }
                
                .grindstone-value {
                  border: solid #383e48;
                  border-width: 1px 0 1px 1px;
                  padding: 1px 5px 0 5px;
                  background-color: var(--color-bg-grindstone, #2e333b);
                  border-radius: 5px 0 0 5px;
                  color: #d0d4db;
                  width: 35px;
                  height: 22px;
                  text-align: right;
                  white-space: nowrap;
                }
                
                .grindstone-proc-max-value {
                  border: solid #383e48;
                  border-width: 1px 1px 1px 0;
                  padding: 1px 5px 0 5px;
                  background-color: var(--color-bg-grindstone, #77825F);
                  border-radius: 0 5px 5px 0;
                  color: var(--color-text-grindstone, #2e333b);
                  font-weight: bold;
                  width: 35px;
                  height: 22px;
                  text-align: left;
                }
                
                .ancient {
                  height: 18px;
                }
    `;
  },
  // #endregion
};

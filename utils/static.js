
var SLStatic = {
  // Not so static after all. TODO: Figure out some way to handle these user-
  // defined functions in a more functional style.
  ufuncs: null,

  i18n: null,

  timeRegex: /^(2[0-3]|[01]?\d):?([0-5]\d)$/,

  created: new Date(),

  async logger(msg, level, stream) {
    const levels = ["all","trace","debug","info","warn","error","fatal"];
    let prefs;
    try {
      prefs = await browser.storage.local.get("preferences").then(s=>
        (s.preferences||{})
      );
    } catch {
      prefs = { logConsoleLevel: "all" };
    }
    
    if (levels.indexOf(level) >= levels.indexOf(prefs.logConsoleLevel)) {
      const output = stream || console.log;
      output(`${level.toUpperCase()} [SendLater]:`, ...msg);
    }
  },

  async error(...msg)  { SLStatic.logger(msg, "error", console.error) },
  async warn(...msg)   { SLStatic.logger(msg, "warn",  console.warn) },
  async info(...msg)   { SLStatic.logger(msg, "info",  console.info) },
  async log(...msg)    { SLStatic.logger(msg, "info",  console.log) },
  async debug(...msg)  { SLStatic.logger(msg, "debug", console.debug) },
  async trace(...msg)  { SLStatic.logger(msg, "trace", console.trace) },

  flatten: function(arr) {
    // Flattens an N-dimensional array.
    return arr.reduce((res, item) => res.concat(
                        Array.isArray(item) ? SLStatic.flatten(item) : item
                      ), []);
  },

  parseableDateTimeFormat: function(date) {
    const DATE_RFC2822 = "ddd, DD MMM YYYY HH:mm:ss ZZ";
    return moment(date || (new Date())).locale("en").format(DATE_RFC2822);
  },

  humanDateTimeFormat: function(date) {
    return moment(date).format('LLL');
  },

  shortHumanDateTimeFormat: function(date) {
    //return moment(date).format("M/D/YYYY, h:mm A");
    return date.toLocaleString([], {month:'numeric',day:'numeric',year:'numeric',
                                    hour:'numeric',minute:'2-digit'});
  },

  compare: function (a, comparison, b) {
    switch (comparison) {
      case "<":
        return (a < b);
      case ">":
        return (a > b);
      case "<=":
        return (a <= b);
      case ">=":
        return (a >= b);
      case "==":
        return (a == b);
      case "===":
        return (a === b);
      case "!=":
        return (a != b);
      case "!==":
        return (a !== b);
      default:
        throw new Error("Unknown comparison: "+comparison);
        break;
    }
  },

  compareDates: function(a,comparison,b) {
    const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return SLStatic.compare(A.getTime(),comparison,B.getTime());
  },

  compareTimes: function(a,comparison,b,ignoreSec) {
    const A = new Date(2000, 0, 01, a.getHours(), a.getMinutes(),
                        (ignoreSec ? 0 : a.getSeconds()));
    const B = new Date(2000, 0, 01, b.getHours(), b.getMinutes(),
                        (ignoreSec ? 0 : b.getSeconds()));
    return SLStatic.compare(A.getTime(),comparison,B.getTime());
  },

  compareDateTimes: function(a, comparison, b, ignoreSec) {
    const A = new Date(a.getTime());
    const B = new Date(b.getTime());
    if (ignoreSec) {
      A.setSeconds(0);
      B.setSeconds(0);
    }
    return SLStatic.compare(A.getTime(), comparison, B.getTime());
  },

  getWkdayName: function(i, style) {
    style = style || "long";
    const d = new Date(2000,0,2+(+i)); // 2000/01/02 Happens to be a Sunday
    return (new Intl.DateTimeFormat('default', {weekday:style})).format(d);
  },

  parseDateTime: function(dstr,tstr) {
    // Inputs: dstr (formatted YYYY/MM/DD), tstr (formatted HH:MM)
    const dpts = dstr ? dstr.split(/\D/) : [0,1,0];
    const tpts = SLStatic.timeRegex.test(tstr) ?
                    SLStatic.timeRegex.exec(tstr) : [null, 0, 0];
    return new Date(+dpts[0], --dpts[1], +dpts[2], +tpts[1], +tpts[2]);
  },

  formatTime: function(datetime,zeropad) {
    if (typeof datetime === "string" || typeof datetime === "number") {
      datetime = SLStatic.parseDateTime(null, (""+datetime));
    }
    const hours = (""+datetime.getHours()).padStart((zeropad?2:1),"0");
    const minutes = (""+datetime.getMinutes()).padStart(2,"0");
    return `${hours}:${minutes}`;
  },

  call: function(name, body, prev, args) {
    const argStr = SLStatic.unparseArgs(args);
    return browser.SL3U.call(name, body, prev.getTime(), argStr);
  },

  formatRecurForUI(recur) {
    let recurText;
    if (recur.type === "function") {
      // Almost certainly doesn't work for all languages. Need a new translation
      // for "recur according to function $1"
      recurText = this.i18n.getMessage("sendwithfunction",
                                  [recur.function]).replace(/^\S*/,
                                    this.i18n.getMessage("recurLabel"));
      if (recur.args) {
        recurText += "<br/>" +
          this.i18n.getMessage("sendlater.prompt.functionargs.label") +
          `: [${recur.args}]`;
      }
    } else if (recur.type === "none") {
      return "";
    } else {
      recurText = this.i18n.getMessage("recurLabel") + " ";
      if (recur.monthly_day) {
        const ordDay = this.i18n.getMessage("ord" + recur.monthly_day.week);
        const dayName = SLStatic.getWkdayName(recur.monthly_day.day, "long");
        recurText += (this.i18n.getMessage("sendlater.prompt.every.label")
                        .toLowerCase()) + " " +
                      this.i18n.getMessage("everymonthly_short",
                                              [ordDay, dayName]);
      } else {
        const multiplier = (recur.multiplier || 1);
        if (multiplier === 1) {
          recurText += this.i18n.getMessage(recur.type);
        } else {
          recurText += this.i18n.getMessage("every_"+recur.type,
                                            multiplier);
        }
      }

      if (recur.between) {
        const start = SLStatic.formatTime(recur.between.start);
        const end = SLStatic.formatTime(recur.between.end);
        recurText += " " + this.i18n.getMessage("betw_times", [start, end]);
      }

      if (recur.days) {
        // TODO: internationalize this
        const days = recur.days.map(v=>SLStatic.getWkdayName(v));
        let onDays;
        if (days.length === 1) {
          onDays = days;
        } else if (days.length === 2) {
          onDays = days.join(" and ");
        } else {
          const ndays = days.length;
          days[ndays-1] = `and ${days[ndays-1]}`;
          onDays = days.join(", ");
        }
        recurText += "<br/>"+this.i18n.getMessage("only_on_days",onDays);
      }
    }

    if (recur.cancelOnReply) {
      recurText += "<br/>" + this.i18n.getMessage("cancel_on_reply");
    }

    return recurText;
  },

  formatScheduleForUIColumn(schedule) {
      let sendAt = schedule.sendAt;
      let recur = schedule.recur;

      if (typeof recur === "string") {
        recur = SLStatic.parseRecurSpec(recur);
      }

      let scheduleText;
      if (recur !== undefined && !sendAt && (recur.type === "function")) {
        scheduleText = this.i18n.getMessage("sendwithfunction",
                                                [recur.function]);
      } else {
        scheduleText = SLStatic.shortHumanDateTimeFormat(sendAt);
      }

      if (recur !== undefined && recur.type !== "none") {
        const rTxt = SLStatic.formatRecurForUI(recur).replace(/<br\/>/g," ");
        scheduleText += ` (${rTxt})`;
      }

      return scheduleText;
  },

  formatScheduleForUI(schedule) {
    const sendAt = schedule.sendAt;
    sendAt.setSeconds(this.created.getSeconds());
    const recur = schedule.recur;

    let scheduleText;
    if (!sendAt && (recur.type === "function")) {
      scheduleText = this.i18n.getMessage("sendwithfunction",
                                              [recur.function]);
    } else {
      scheduleText = this.i18n.getMessage("sendAtLabel");
      scheduleText += " " + SLStatic.humanDateTimeFormat(sendAt);
      scheduleText += ` (${moment(sendAt).fromNow()})`;
    }

    if (recur.type  !== "none") {
      scheduleText += "<br/>" + SLStatic.formatRecurForUI(recur);
    }

    return scheduleText;
  },

  stateSetter: function(enabled) {
    // closure for disabling UI components
    return (async element => {
        try{
          if (["SPAN","DIV","LABEL"].includes(element.tagName)) {
            element.style.color = enabled ? "black" : "#888888";
          }
          element.disabled = !enabled;
        } catch (ex) {
          SLStatic.error(ex);
        }
        const enabler = SLStatic.stateSetter(enabled);
        [...element.childNodes].forEach(enabler);
      });
  },

  replaceHeader: function(content, header, value) {
    const replacement = (value) ? `\r\n${header}: ${value}\r\n` : '\r\n';
    const regex = `\r\n${header}:.*(?:\r\n|\n)([ \t].*(?:\r\n|\n))*`;
    content = ("\r\n" + content).replace(new RegExp(regex,'im'), replacement);
    return content.slice(2);
  },

  prepNewMessageHeaders: function(content) {
    content = SLStatic.replaceHeader(content, "Date", SLStatic.parseableDateTimeFormat());
    content = SLStatic.replaceHeader(content, "X-Send-Later-.*");
    content = SLStatic.replaceHeader(content, "X-Enigmail-Draft-Status");
    content = SLStatic.replaceHeader(content, "Openpgp");
    return content;
  },

  parseArgs: function(argstring) {
    return JSON.parse(`[${argstring||""}]`);
  },

  unparseArgs: function(args) {
    // Convert a list into its string representation, WITHOUT the square
    // braces around the entire list.
    let arglist = JSON.stringify(args||[], null, ' ');
    arglist = arglist.replace(/\r?\n\s*/g,' '); // Remove newlines from stringify
    arglist = arglist.replace(/\[\s*/g,'[').replace(/\s*\]/g,']'); // Cleanup
    arglist = arglist.replace(/^\[|\]$/g, ''); // Strip outer brackets
    return arglist;
  },

  /* Format:
  First field is none/minutely/daily/weekly/monthly/yearly/function

  If first field is monthly, then it is followed by either one or
  two numbers. If one, then it's a single number for the day of
  the month; otherwise, it's the day of the week followed by its
  place within the month, e.g., "1 3" means the third Monday of
  each month.

  If the first field is yearly, then the second and third fields
  are the month (0-11) and date numbers for the yearly occurrence.

  After all of the above except function, "/ #" indicates a skip
  value, e.g., "/ 2" means every 2, "/ 3" means every 3, etc. For
  example, "daily / 3" means every 3 days, while "monthly 2 2 /
  2" means every other month on the second Tuesday of the month.

  If the first field is function, then the second field is the
  name of a global function which will be called with one
  argument, the previous scheduled send time (as a Date
  object), and an array of arguments returned by the previous
  invocation. It has three legal return values:

    -1 - stop recurring, i.e., don't schedule any later instances
      of this message

    integer 0 or greater - schedule this message the specified
      number of minutes into the future, then stop recurring

    array [integer 0 or greater, recur-spec, ...] - schedule this
      message the specified number of minutes into the future,
      with the specified recurrence specification for instances
      after this one, and pass the remaining items in the array into the
      next invocation of the function as an arguments array

  If the word "finished" appears in the spec anywhere after the function
  name, then it indicates that the specified function should _not_ be
  called again; rather, we're finished scheduling future sends of this
  message, but the function is being preserved in the recurrence
  specification so that it'll be set properly in the dialog if the user
  edits the scheduled message.

  The other fields can be followed by " between HH:MM HH:MM" to indicate a
  time restriction or " on # ..." to indicate a day restriction.
  */

  // recur (object) -> recurSpec (string)
  unparseRecurSpec: function(recur) {
    let spec = recur.type;

    if (recur.type === "none") {
      return "none";
    } else if (recur.type === "monthly") {
      spec += " ";
      if (recur.monthly_day) {
        spec += recur.monthly_day.day + " " + recur.monthly_day.week;
      } else {
        spec += recur.monthly;
      }
    } else if (recur.type === "yearly") {
      spec += " " + recur.yearly.month + " " + recur.yearly.date;
    } else if (recur.type === "function") {
      spec += " " + recur.function;
      if (recur.finished) {
        spec += " finished";
      }
    }

    if (recur.multiplier) {
      spec += " / " + recur.multiplier;
    }

    if (recur.between) {
      const start = SLStatic.formatTime(recur.between.start);
      const end = SLStatic.formatTime(recur.between.end);
      spec += ` between ${start} ${end}`;
    }

    if (recur.days) {
      spec += " on " + recur.days.join(' ');
    }

    return spec;
  },

  // recurSpec (string) -> recur (object)
  parseRecurSpec: function(recurSpec) {
    if (!recurSpec) {
      return { type: "none" };
    }

    const params = recurSpec.split(/\s+/);
    const recur = {};
    recur.type = params.shift();
    if (!['none','minutely','daily','weekly','monthly','yearly',
        'function'].includes(recur.type)) {
      throw new Error("Invalid recurrence type in " + recurSpec);
    }
    switch (recur.type) {
      case "none":
        if (params.length) {
          throw new Error("Extra arguments in " + recurSpec);
        } else {
          return { type: "none" };
        }
        break;
      case "monthly":
        if (!/^\d+$/.test(params[0])) {
          throw new Error("Invalid first monthly argument in " + recurSpec);
        }
        if (/^[1-9]\d*$/.test(params[1])) {
          recur.monthly_day = {
            day: params.shift(),
            week: params.shift()
          };
          if (recur.monthly_day.day < 0 || recur.monthly_day.day > 6) {
            throw new Error("Invalid monthly day argument in " + recurSpec);
          }
          if (recur.monthly_day.week < 1 || recur.monthly_day.week > 5) {
            throw new Error("Invalid monthly week argument in " + recurSpec);
          }
        } else {
          recur.monthly = params.shift();
          if (recur.monthly > 31)
            throw new Error("Invalid monthly date argument in " + recurSpec);
        }
        break;
      case "yearly":
        if (!/^\d+$/.test(params[0])) {
          throw "Invalid first yearly argument in " + recurSpec;
        }
        if (!/^[1-9]\d*$/.test(params[1])) {
          throw "Invalid second yearly argument in " + recurSpec;
        }
        recur.yearly = {
          month: +params.shift(),
          date: +params.shift()
        };

        // Check that this month/date combination is possible at all.
        // Use a leap year for this test.
        const test = new Date(2000, recur.yearly.month, recur.yearly.date);
        if ((test.getMonth() !== recur.yearly.month) ||
            (test.getDate() !== recur.yearly.date)) {
          throw new Error("Invalid yearly date in " + recurSpec);
        }
        break;
      case "function":
        recur.function = params.shift();
        const finishedIndex = params.indexOf("finished");
        recur.finished = (params[0] === "finished");

        if (!recur.function) {
          throw new Error("Invalid function recurrence spec");
        }
        break;
      default:
        break;
    }

    if (recur.type !== "function") {
      const slashIndex = params.indexOf("/");
      if (slashIndex > -1) {
          const multiplier = params[slashIndex + 1];
          if (!/^[1-9]\d*$/.test(multiplier)){
            throw new Error("Invalid multiplier argument in " + recurSpec);
          }
          recur.multiplier = +multiplier;
          params.splice(slashIndex, 2);
      }
    }

    const btwnIdx = params.indexOf("between");
    if (btwnIdx > -1) {
      const startTimeStr = params[btwnIdx + 1];
      const endTimeStr = params[btwnIdx + 2];

      if (! SLStatic.timeRegex.test(startTimeStr)) {
        throw new Error("Invalid between start in " + recurSpec);
      } else if (! SLStatic.timeRegex.test(endTimeStr)) {
        throw new Error("Invalid between end in " + recurSpec);
      }

      recur.between = {
        start: SLStatic.formatTime(startTimeStr),
        end: SLStatic.formatTime(endTimeStr)
      };
      params.splice(btwnIdx, 3);
    }
    const onIndex = params.indexOf("on");
    if (onIndex > -1) {
      recur.days = [];
      params.splice(onIndex, 1);
      while (/^\d$/.test(params[onIndex])) {
        const day = params.splice(onIndex, 1)[0];
        if (day > 6) {
          throw new Error("Bad restriction day in " + recurSpec);
        }
        recur.days.push(Number(day));
      }
      if (!recur.days.length) {
        throw new Error("Day restriction with no days in spec "+recurSpec);
      }
    }
    if (params.length) {
      throw new Error("Extra arguments in " + recurSpec);
    }
    return recur;
  },

  nextRecurFunction: async function(prev, recurSpec, recur, args, saveFunction) {
    if (!SLStatic.ufuncs) {
      throw new Error("SLStatic ufuncs object has not been initialzied.");
    } else if (!recur.function) {
      throw new Error(`Invalid recurrence specification '${recurSpec}': ` +
                      "No function defined");
    }

    const funcName = recur.function.replace(/^ufunc:/, "");

    let nextRecur;
    if (SLStatic.ufuncs[funcName] === undefined) {
      throw new Error(`Invalid recurrence specification '${recurSpec}': ` +
                      `${funcName} is not defined.`);
    } else {
      try {
        const func = SLStatic.ufuncs[funcName];
        nextRecur = await SLStatic.call(funcName, func.body, prev, args);
      } catch (ex) {
        throw new Error(`Recurrence function failed with error: ${ex.message}`);
      }
    }

    if (!prev) {
      prev = new Date();
    }

    if (nextRecur === undefined) {
      throw new Error(`Send Later: Recurrence function '${funcName}' did not` +
                      " return a value" + SLStatic.ufuncs[funcName].body);
    }
    if (typeof(nextRecur) === "number") {
      if (nextRecur <= 0) {
        return null;
      } else {
        const next = new Date(prev.getTime() + nextRecur * 60 * 1000);
        nextRecur = [next, null];
      }
    }

    if (nextRecur.getTime) {
      nextRecur = [nextRecur, null];
    }

    if (!nextRecur.splice) {
      throw `Recurrence function "${funcName}" did not return number, Date, or array`;
    }
    if (nextRecur.length < 2) {
      throw new Error(`Array returned by recurrence function "${funcName}" is too short`);
    }
    if (typeof(nextRecur[0]) !== "number" && !(nextRecur[0] && nextRecur[0].getTime)) {
      throw new Error(`Send Later: Array ${nextRecur} returned by recurrence function ` +
            `"${funcName}" did not start with a number or Date`);
    }
    if (typeof(nextRecur[0]) === "number") {
      const next = new Date(prev.getTime() + nextRecur[0] * 60 * 1000);
      nextRecur[0] = next;
    }
    if (!nextRecur[1] && saveFunction) {
      nextRecur[1] = `function "${funcName}" finished`;
    }

    if (!nextRecur[1] && (recur.between || recur.days)) {
      nextRecur[1] = "none";
    }

    if (nextRecur[1]) {
      // Merge restrictions from old spec into this one.
      const functionSpec = SLStatic.parseRecurSpec(nextRecur[1]);
      if (recur.between) {
        functionSpec.between = recur.between;
      }
      if (recur.days) {
        functionSpec.days = recur.days;
      }
      nextRecur[1] = SLStatic.unparseRecurSpec(functionSpec);
    }

    return nextRecur;
  },

  nextRecurDate: async function(next, recurSpec, now, args) {
    // Make sure we don't modify our input!
    next = new Date(next.getTime());
    const recur = SLStatic.parseRecurSpec(recurSpec);

    if (recur.type === "none") {
      return null;
    }

    if (recur.type === "function") {
      if (recur.finished) {
        return null;
      }
      const results = await SLStatic.nextRecurFunction(next, recurSpec, recur, args);
      if (results && results[0] && (recur.between || recur.days))
        results[0] = SLStatic.adjustDateForRestrictions(
                            results[0], recur.between && recur.between.start,
                            recur.between && recur.between.end, recur.days);
      return results;
    }

    if (!now)
      now = new Date();

    let redo = false;

    if (!recur.multiplier) {
      recur.multiplier = 1;
    }

    while ((next <= now) || (recur.multiplier > 0) || redo) {
      redo = false;
      switch (recur.type) {
        case "minutely":
          next.setMinutes(next.getMinutes() + 1)
          break;
        case "daily":
          next.setDate(next.getDate() + 1);
          break;
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "monthly":
          // Two different algorithms are in play here, depending on
          // whether we're supposed to schedule on a day of the month or
          // a weekday of a week of the month.
          //
          // If the former, then either the current day of the month is
          // the same as the one we want, in which case we just move to
          // the next month, or it's not, in which case the "correct"
          // month didn't have that day (i.e., it's 29, 30, or 31 on a
          // month without that many days), so we ended up rolling
          // over. In that case, we set the day of the month of the
          // _current_ month, because we're already in the right month.
          //
          // If the latter, then first check if we're at the correct
          // weekday and week of the month. If so, then go to the first
          // day of the next month. After that, move forward to the
          // correct week of the month and weekday.  If that pushes us
          // past the end of the month, that means the month in question
          // doesn't have, e.g., a "5th Tuesday", so we need to set the
          // redo flag indicating that we need to go through the loop
          // again because we didn't successfully find a date.

          if (recur.monthly) {
            if (next.getDate() === +recur.monthly) {
              next.setMonth(next.getMonth() + 1);
            } else {
              next.setDate(recur.monthly);
            }
          } else {
            if ((next.getDay() === +recur.monthly_day.day) &&
                (Math.ceil(next.getDate() / 7) === +recur.monthly_day.week)) {
              next.setDate(1);
              next.setMonth(next.getMonth() + 1);
            } else {}
            next.setDate((recur.monthly_day.week - 1) * 7 + 1);
            while (next.getDay() !== +recur.monthly_day.day) {
              next.setDate(next.getDate() + 1);
            }
            if (Math.ceil(next.getDate() / 7) !== +recur.monthly_day.week) {
              redo = true;
            }
          }
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() + 1);
          next.setMonth(recur.yearly.month);
          next.setDate(recur.yearly.date);
          break;
        default:
          throw new Error("Send Later error: unrecognized recurrence type: " +
                 recur.type);
          break;
      }

      recur.multiplier--;
    }

    if (recur.between || recur.days) {
      next = SLStatic.adjustDateForRestrictions(next,
                      (recur.between && recur.between.start),
                      (recur.between && recur.between.end), recur.days);
    }

    return next;
  },

  // dt is a Date object for the scheduled send time we need to adjust.
  // start_time and end_time are numbers like HHMM, e.g., 10:00am is
  // 1000, 5:35pm is 1735, or null if there is no time restriction.
  // days is an array of numbers, with 0 being Sunday and 6 being Saturday,
  // or null if there is no day restriction.
  // Algorithm:
  // 1) Copy args so we don't modify them.
  // 2) If there is a time restriction and the scheduled time is before it,
  //    change it to the beginning of the time restriction.
  // 3) If there is a time restriction and the scheduled time is after it,
  //    change it to the beginning of the time restriction the next day.
  // 4) If there is a day restriction and the scheduled day isn't in it,
  //    change the day to the smallest day in the restriction that is larger
  //    than the scheduled day, or if there is none, then the smallest day in
  //    the restriction overall.
  adjustDateForRestrictions: function(sendAt, start_time, end_time, days) {
    let dt = new Date(sendAt.getTime());
    start_time = start_time && SLStatic.parseDateTime(null,start_time);
    end_time = end_time && SLStatic.parseDateTime(null,end_time);

    if (start_time && SLStatic.compareTimes(dt, '<', start_time)) {
      // If there is a time restriction and the scheduled time is before it,
      // reschedule to the beginning of the time restriction.
      dt.setHours(start_time.getHours());
      dt.setMinutes(start_time.getMinutes());
    } else if (end_time && SLStatic.compareTimes(dt, '>', end_time)) {
      // If there is a time restriction and the scheduled time is after it,
      // reschedule to the beginning of the time restriction the next day.
      dt.setDate(dt.getDate() + 1); // works on end of month, too.
      dt.setHours(start_time.getHours());
      dt.setMinutes(start_time.getMinutes());
    }
    // If there is a day restriction and the scheduled day isn't in it, then
    // increment the scheduled date by 1 day at a time until it reaches the
    // next unrestricted day.
    while (days && !days.includes(dt.getDay())) {
      dt.setDate(dt.getDate()+1);
    }
    return dt;
  }
}

/*
We need to mock certain functions depending on the execution context. We made it
to this point either through the extension itself, or through an experiment context,
or via a Node-based unit test.
*/

// First, we need access to the i18n localization strings. This is trivial if
// we are inside of the extension context, but from outside of that context we
// need to access the extension, or create a mock translation service.
if (SLStatic.i18n === null) {
  if (typeof browser !== "undefined" && browser.i18n) {
    // We're in the extension context.
    SLStatic.i18n = browser.i18n;
  } else if (typeof require === "undefined") {
    // We're in an experiment context.
    try {
      SLStatic.i18n = {
        getMessage: function(messageName, substitutions = [], options = {}) {
          try {
            messageName = messageName.toLowerCase();

            const ext = (window.ExtensionParent.GlobalManager.extensionMap
                          .get("sendlater3@kamens.us"));

            let messages, str;

            const defaultLocale = ext.localeData.defaultLocale;
            if (ext.localeData.messages.has(defaultLocale)) {
              messages = ext.localeData.messages.get(defaultLocale);
              if (messages.has(messageName)) {
                str = messages.get(messageName);
              }
            }

            if (str === undefined) {
              console.warn(`Unable to find message ${messageName} in locale ${defaultLocale}`);
              for (let locale of ext.localeData.availableLocales) {
                if (ext.localeData.messages.has(locale)) {
                  messages = ext.localeData.messages.get(locale);
                  if (messages.has(messageName)) {
                    str = messages.get(messageName);
                    break;
                  }
                }
              }
            }

            if (!str.includes("$")) {
              return str;
            }

            if (!Array.isArray(substitutions)) {
              substitutions = [substitutions];
            }

            let replacer = (matched, index, dollarSigns) => {
                if (index) {
                  // This is not quite Chrome-compatible. Chrome consumes any number
                  // of digits following the $, but only accepts 9 substitutions. We
                  // accept any number of substitutions.
                  index = parseInt(index, 10) - 1;
                  return index in substitutions ? substitutions[index] : "";
                }
                // For any series of contiguous `$`s, the first is dropped, and
                // the rest remain in the output string.
                return dollarSigns;
              };
              return str.replace(/\$(?:([1-9]\d*)|(\$+))/g, replacer);
          } catch (e) {
            console.warn("Unable to get localized message.",e);
          }
          return "";
        },
      };
      console.debug("Got i18n locales from extension", SLStatic.i18n);
    } catch (e) {
      console.debug("Unable to load i18n from extension.",e);
    }
  } else {
    // We're in a node process (unit test).
    SLStatic.i18n = {
      getMessage(key, args) {
        if (typeof args !== "object") {
          args = [args];
        }
        try {
          let msg;
          if (typeof localeMessages === "object") {
            // browser environment
            msg = localeMessages[key].message;
          } else {
            // node.js environment
            msg = global.localeMessages[key].message;
          }
          return msg.replace(/\$\d/g, (i) => args[--i[1]] );
        } catch (e) {
          console.warn(e);
          return key;
        }
      }
    };
  }
}

/*
Unit and functional tests require other mocked browser objects. Since we don't
need to worry about polluting the global namespace in a unit test, we'll just
create a mock global browser object here.
*/
if (typeof browser === "undefined" && typeof require !== "undefined") {
  var browserMocking = true;
  var mockStorage = {};
  var moment = require('./moment.min.js');

  console.info("Defining mock browser object for Node unit tests.");
  var browser = {
    storage: {
      local: {
        async get(key) {
          if (typeof key === "string") {
            const keyobj = {};
            keyobj[key] = {};
            key = keyobj;
          }
          const ret = {};
          Object.keys(key).forEach(key => {
            if (mockStorage[key]) {
              ret[key] = mockStorage[key];
            } else {
              ret[key] = { };
            }
          });

          return ret;
        },
        async set (item) {
          console.log("mock storage", mockStorage);
          Object.assign(mockStorage, item);
          console.log("mock storage", mockStorage);
        }
      }
    },
    runtime: {
      sendMessage(...args) {
        console.debug("Sent message to background script",args);
      }
    },
    SL3U: {
      saveAsDraft: function(){},
      sendNow: function(batch){},
      setHeader: function (key,value){},
      getHeader: function(key){return key;},
      getLegacyPref: function(name, dtype, def){return null;},
      alert: function(msg) {console.warn(`ALERT ${msg}`);},
      async call(name, body, prev, argstring) {
        body = `let next, nextspec, nextargs; ${body}; ` +
                "return([next, nextspec, nextargs]);";
        prev = new Date(prev);
        const args = JSON.parse(`[${argstring||""}]`);
        const FUNC = Function.apply(null, ["specname", "prev", "args", body]);

        return FUNC(name, prev, args);
      }
    }
  }

  if (typeof window === 'undefined') {
    // Make this file node.js-aware for browserless unit testing
    const fs = require('fs'),
          path = require('path'),
          filePath = path.join(__dirname, '..', '_locales','en','messages.json');;
    const contents = fs.readFileSync(filePath, {encoding: 'utf-8'});
    global.localeMessages = JSON.parse(contents);
    global.SLStatic = SLStatic;
    global.browser = browser;
  } else {
    // We're in a non-addon browser environment (functional tests)
    fetch("/_locales/en/messages.json").then(
      response => response.json()
    ).then(locale => {
      localeMessages = locale;
    });
  }

  SLStatic.ufuncs = {
    ReadMeFirst: {help: "Any text you put here will be displayed as a tooltip when you hover over the name of the function in the menu. You can use this to document what the function does and what arguments it accepts.", body: "// Send the first message now, subsequent messages once per day.\nif (! prev)\n    next = new Date();\nelse {\n    var now = new Date();\n    next = new Date(prev); // Copy date argument so we don't modify it.\n    do {\n        next.setDate(next.getDate() + 1);\n    } while (next < now);\n    // ^^^ Don't try to send in the past, in case Thunderbird was asleep at\n    // the scheduled send time.\n}\nif (! args) // Send messages three times by default.\n    args = [3];\nnextargs = [args[0] - 1];\n// Recur if we haven't done enough sends yet.\nif (nextargs[0] > 0)\n    nextspec = \"function \" + specname;"},
    BusinessHours: {help:"Send the message now if it is during business hours, or at the beginning of the next work day. You can change the definition of work days (default: Mon - Fri) by passing in an array of work-day numbers as the first argument, where 0 is Sunday and 6 is Saturday. You can change the work start or end time (default: 8:30 - 17:30) by passing in an array of [H, M] as the second or third argument. Specify “null” for earlier arguments you don't change. For example, “null, [9, 0], [17, 0]” changes the work hours without changing the work days.",body:"// Defaults\nvar workDays = [1, 2, 3, 4, 5]; // Mon - Fri; Sun == 0, Sat == 6\nvar workStart = [8, 30]; // Start of the work day as [H, M]\nvar workEnd = [17, 30]; // End of the work day as [H, M]\nif (args && args[0])\n    workDays = args[0];\nif (args && args[1])\n    workStart = args[1];\nif (args && args[2])\n    workEnd = args[2];\nif (prev)\n    // Not expected in normal usage, but used as the current time for testing.\n    next = new Date(prev);\nelse\n    next = new Date();\n// If we're past the end of the workday or not on a workday, move to the work\n// start time on the next day.\nwhile ((next.getHours() > workEnd[0]) ||\n       (next.getHours() == workEnd[0] && next.getMinutes() > workEnd[1]) ||\n       (workDays.indexOf(next.getDay()) == -1)) {\n    next.setDate(next.getDate() + 1);\n    next.setHours(workStart[0]);\n    next.setMinutes(workStart[1]);\n}\n// If we're before the beginning of the workday, move to its start time.\nif ((next.getHours() < workStart[0]) ||\n    (next.getHours() == workStart[0] && next.getMinutes() < workStart[1])) {\n    next.setHours(workStart[0]);\n    next.setMinutes(workStart[1]);\n}"},
    DaysInARow: {help:"Send the message now, and subsequently once per day at the same time, until it has been sent three times. Specify a number as an argument to change the total number of sends.",body:"// Send the first message now, subsequent messages once per day.\nif (! prev)\n    next = new Date();\nelse {\n    var now = new Date();\n    next = new Date(prev); // Copy date argument so we don't modify it.\n    do {\n        next.setDate(next.getDate() + 1);\n    } while (next < now);\n    // ^^^ Don't try to send in the past, in case Thunderbird was asleep at\n    // the scheduled send time.\n}\nif (! args) // Send messages three times by default.\n    args = [3];\nnextargs = [args[0] - 1];\n// Recur if we haven't done enough sends yet.\nif (nextargs[0] > 0)\n    nextspec = \"function \" + specname;"},
    Delay: {help:"Simply delay message by some number of minutes. First argument is taken as the delay time.", body:"next = new Date(Date.now() + args[0]*60000);"}
  }

  mockStorage.ufuncs = SLStatic.ufuncs;
}

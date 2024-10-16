"use strict";

// Demande le lancement de l'exécution quand toute la page Web sera chargée
window.addEventListener('load', go);

// SAM Design Pattern : http://sam.js.org/
let actions,
  model,
  state,
  view;

// Point d'entrée de l'application
function go() {
  console.log('GO !');

  actions.initAndGo({ time: ['01', '23', '45'] });
}

//-------------------------------------------------------------------- Utils ---

function format2digits(n) {
  return n < 10 ? '0' + n : '' + n;
}

//------------------------------------------------------------------ Actions ---
// Actions appelées dans le code HTML quand des événements surviennent
//
actions = {

  initAndGo(data) {
    let time = data.time;
    model.samPresent({ do: 'init', time: time })
  },

  startTime() {
    const intervalId = window.setInterval(actions.updateTime, 1000);
    model.samPresent({ do: 'startTime', intervalId: intervalId });
  },

  stopTime() {
    window.clearInterval(model.time.intervalId);
    model.samPresent({ do: 'stopTime', intervalId: null });
  },

  updateTime() {
    const date = new Date();
    let hh = date.getHours();
    let mm = date.getMinutes();
    let ss = date.getSeconds();
    hh = format2digits(hh);
    mm = format2digits(mm);
    ss = format2digits(ss);
    model.samPresent({ do: 'updateTime', time: [hh, mm, ss] });
  },

  addAlarm() {
    model.samPresent({ do: 'addAlarm' });
  },

  changeAlarmTime(data) {
    const val = data.e.target.value;
    const index = data.index;
    const part = data.part === 'hour' ? 0 : 1;
    model.samPresent({ do: 'changeAlarmTime', value: val, index: index, part: part });
  },

  changeAlarmDescription(data) {
    const text = data.e.target.value;
    const index = data.index;
    model.samPresent({ do: 'changeAlarmDescription', message: text, index: index });
  },

  removeAlarm(data) {
    const index = data.index;
    window.clearTimeout(model.alarms.values[index].timeoutId);
    model.samPresent({ do: 'removeAlarm', index: index });
  },

  setAlarm(data) {
    const index = data.index;
    const checked = data.e.target.checked;
    let timeoutId = null;
    if (checked) {
      const time = model.alarms.values[index].time;
      let alarmDate = new Date();
      alarmDate.setHours(time[0]);
      alarmDate.setMinutes(time[1]);
      alarmDate.setSeconds(time[2]);
      let curDate = new Date();
      let diffDate = alarmDate - curDate;
      if (diffDate > 0) {
        timeoutId = window.setTimeout(() => {
          actions.fireAlarm({ alarm: model.alarms.values[index], index: index });
        }, diffDate);
      }
    } else {
      window.clearTimeout(model.alarms.values[index].timeoutId);
      timeoutId = null;
    }
    model.samPresent({ do: 'setAlarm', timeoutId: timeoutId, index: index });
  },

  fireAlarm(data) {
    console.log(data.alarm);
    const [h, m] = data.alarm.time;
    const time = [h, m].join(':');
    const message = data.alarm.message;
    alert(['Alarme !', `Il est ${time}.`, `message : ${message}`].join('\n\n'));
    model.samPresent({ do: 'doneAlarm', index: data.index });
  }

};

//-------------------------------------------------------------------- Model ---
// Unique source de vérité de l'application
//
model = {
  time: {
    value: ['00', '00', '00'],
    isOn: false,
    intervalId: null,
    sectionId: 'time',
    hasChanged: true,
  },
  alarms: {
    values: [
      // {
      //   time: [],
      //   message: '',
      //   timeoutId: null,
      // },
    ],
    sectionId: 'alarms',
    hasChanged: true,
  },

  // Demande au modèle de se mettre à jour en fonction des données qu'on
  // lui présente.
  // l'argument data est un objet confectionné dans les actions.
  // Les propriétés de data comportent les modifications à faire sur le modèle.
  samPresent(data) {

    switch (data.do) {

      case 'init':
        this.time.value = data.time;
        break;

      case 'startTime':
        this.time.intervalId = data.intervalId;
        this.time.isOn = true;
        this.time.hasChanged = true;
        break;

      case 'stopTime':
        this.time.intervalId = data.intervalId;
        this.time.isOn = false;
        this.time.hasChanged = true;
        break;

      case 'updateTime':
        this.time.value = data.time;
        this.time.hasChanged = true;
        break;

      case 'addAlarm':
        let [th, tm] = this.time.value;
        const date = new Date();
        date.setHours(th);
        date.setMinutes(tm);
        date.setMinutes(date.getMinutes() + 1);
        th = format2digits(date.getHours());
        tm = format2digits(date.getMinutes());
        const time = [th, tm, '00'];

        const newAlarm = {
          time: time,
          message: '',
          timeoutId: null,
        };
        this.alarms.values.push(newAlarm);
        this.alarms.hasChanged = true;
        break;

      case 'changeAlarmTime':
        this.alarms.values[data.index].time[data.part] = data.value;
        this.alarms.hasChanged = true;
        break;

      case 'changeAlarmDescription':
        this.alarms.values[data.index].message = data.message;
        this.alarms.hasChanged = true;
        break;

      case 'removeAlarm':
        this.alarms.values.splice(data.index, 1);
        this.alarms.hasChanged = true;
        break;

      case 'setAlarm':
        this.alarms.values[data.index].timeoutId = data.timeoutId;
        this.alarms.hasChanged = true;
        break;

      case 'doneAlarm':
        this.alarms.values[data.index].timeoutId = null;
        this.alarms.hasChanged = true;
        break;

      default:
        console.error(`model.samPresent(), unknown do: '${data.do}' `);
    }
    // Demande à l'état de l'application de prendre en compte la modification
    // du modèle
    state.samUpdate(this);
  }
};
//-------------------------------------------------------------------- State ---
// État de l'application avant affichage
//
state = {

  samUpdate(model) {

    this.samRepresent(model);
    // this.samNap(model);
  },

  // Met à jour l'état de l'application, construit le code HTML correspondant,
  // et demande son affichage.
  samRepresent(model) {
    let representation = 'Oops, should not see this...';

    if (model.time.hasChanged) {
      model.time.hasChanged = false;
      representation = view.timeUI(model, this);
      view.samDisplay(model.time.sectionId, representation);
    }
    if (model.alarms.hasChanged) {
      model.alarms.hasChanged = false;
      representation = view.alarmsUI(model, this);
      view.samDisplay(model.alarms.sectionId, representation);
    }
  }
};
//--------------------------------------------------------------------- View ---
// Génération de portions en HTML et affichage
//
view = {

  // Injecte le HTML dans une balise de la page Web.
  samDisplay(sectionId, representation) {
    const section = document.getElementById(sectionId);
    section.innerHTML = representation;
  },

  // Renvoit le HTML
  timeUI(model, state) {
    const stopStartText = model.time.isOn ? 'Arrêter' : 'Démarrer';
    const stopStartAction = model.time.isOn ? 'stopTime()' : 'startTime()';
    return `
      <time>${model.time.value.join(':')}</time>
      <div>
        <button class="time" onclick="actions.updateTime()">Heure courante</button>
        <button class="time" onclick="actions.${stopStartAction}">${stopStartText}</button>
      </div>
    `;
  },

  alarmsUI(model, state) {
    const alarmsCode = this.insertAlarms(model, state);
    return `
      <div class="alarmes">
        ${alarmsCode}
      </div>
      <button class="ajouter" onclick="actions.addAlarm()">Ajouter une alarme</button>
    `;
  },

  insertAlarms(model, state) {
    let alarmsCode = '';
    model.alarms.values.forEach((v, i) => {
      const checked = v.timeoutId ? 'checked="checked"' : '';
      const disabled = v.timeoutId ? 'disabled="disabled"' : '';
      alarmsCode += `
      <div class="alarme">
        <input type="checkbox" onclick="actions.setAlarm({e:event, index:${i}})" ${checked} />
        <select onchange="actions.changeAlarmTime({e: event, part:'hour', index:${i}})" ${disabled}>
          ${this.insertOptions(23, parseInt(v.time[0]))}
        </select>
        <select onchange="actions.changeAlarmTime({e: event, part:'minutes', index:${i}})" ${disabled}>
          ${this.insertOptions(59, parseInt(v.time[1]))}
        </select>
        <input onchange="actions.changeAlarmDescription({e:event, index:${i}})" type="text" placeholder="Description de l'alarme" value="${v.message}" ${disabled}/>
        <button onclick="actions.removeAlarm({index:${i}})" class="enlever">Enlever cette alarme</button>
      </div>
      `;
    });
    return alarmsCode;
  },

  insertOptions(max, selected) {
    let optionsCode = [];
    for (var i = 0; i <= max; i++) {
      const val = format2digits(i);
      optionsCode[i] = `<option value="${val}">${val}</option>`
    }
    optionsCode[selected] = optionsCode[selected].replace('<option', '<option selected="selected"');
    return optionsCode.join('\n');
  }
};

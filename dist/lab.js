// FRAME calibration lab: deterministic setups and measurements of *simulated*
// outcomes. These are not experimentally validated reference measurements.

export const LAB_SCENARIOS = Object.freeze([
  {id: 'stop', title: 'TIR D’ARRÊT', subtitle: 'Blanche et bille alignées',
    balls: [[0,-0.73,0],[1,-0.27,0]], aim: [1,0], spin: [0,-0.80], power: 55, elevation: 0},
  {id: 'draw', title: 'RÉTRO', subtitle: 'Retour après le contact',
    balls: [[0,-0.73,0],[1,-0.27,0]], aim: [1,0], spin: [0,-0.70], power: 64, elevation: 0},
  {id: 'follow', title: 'COULÉ', subtitle: 'Poursuite après le contact',
    balls: [[0,-0.73,0],[1,-0.27,0]], aim: [1,0], spin: [0,0.60], power: 47, elevation: 0},
  {id: 'bank', title: 'BANDE + EFFET', subtitle: 'Rebond avec rotation latérale',
    balls: [[0,-0.69,-0.22],[1,0.72,-0.32]], aim: [0.73,0.68], spin: [0.48,0], power: 62, elevation: 0},
  {id: 'swerve', title: 'TRAJECTOIRE COURBE', subtitle: 'Squirt puis swerve sur le tapis',
    balls: [[0,-0.76,-0.12],[1,0.40,0.12]], aim: [1,0], spin: [0.70,0], power: 54, elevation: 15},
]);

export function getLabScenario(id) {
  const template = LAB_SCENARIOS.find(s => s.id === id);
  if (!template) return null;
  return {id: template.id, title: template.title, subtitle: template.subtitle,
    balls: template.balls.map(([num,x,z]) => ({num,x,z})),
    aim: {x: template.aim[0], z: template.aim[1]},
    spin: {x: template.spin[0], y: template.spin[1]},
    power: template.power, elevation: template.elevation};
}

const SNAPSHOT_INTERVAL = 1 / 60;
const TRACE_DISTANCE_EPS = 0.0008;

export class ShotTelemetry {
  constructor(balls, aim, label = 'JEU LIBRE', settings = {}) {
    this.label = label;
    this.aim = {...aim};
    this.settings = {
      power: Number(settings.power) || 0,
      tipX: Number(settings.tipX) || 0,
      tipY: Number(settings.tipY) || 0,
      elevation: Number(settings.elevation) || 0,
      cushionModel:settings.cushionModel||'empirical',
    };
    this.duration = 0;
    this.cueDistance = 0;
    this.cushions = 0;
    this.collisions = 0;
    this.firstContact = null;
    this.firstObject = null;
    this.potted = new Set();
    this.points = new Map();
    this.previous = new Map();
    this.record(balls, 0, true);
  }

  record(balls, time, force = false) {
    this.duration = Math.max(this.duration, time);
    for (const b of balls) {
      if (!b.active && !force) continue;
      const previous = this.previous.get(b.num);
      if (previous && b.num === 0) this.cueDistance += Math.hypot(b.x - previous.x, b.z - previous.z);
      this.previous.set(b.num, {x:b.x, z:b.z});
      const path = this.points.get(b.num) || [];
      const last = path[path.length - 1];
      if (force || !last || (time - last.t >= SNAPSHOT_INTERVAL - 1e-6 &&
          Math.hypot(b.x - last.x, b.z - last.z) >= TRACE_DISTANCE_EPS)) {
        path.push({t:time, x:b.x, z:b.z, speed:Math.hypot(b.vx,b.vz),
          wx:b.wx,wy:b.wy,wz:b.wz});
        this.points.set(b.num, path);
      }
    }
  }

  onCollision(a, b, time) {
    this.collisions++;
    if (this.firstContact || (a.num !== 0 && b.num !== 0)) return;
    const cue = a.num === 0 ? a : b;
    this.firstObject = a.num === 0 ? b.num : a.num;
    this.firstContact = {t:time, x:cue.x, z:cue.z};
  }

  onCushion() { this.cushions++; }

  onPocket(b, time) {
    this.potted.add(b.num);
    this.record([b],time,true);
  }

  summary(cue) {
    const contact = this.firstContact;
    const postContact = contact && cue && cue.active
      ? (cue.x - contact.x) * this.aim.x + (cue.z - contact.z) * this.aim.z : null;
    return {duration:this.duration, cueDistance:this.cueDistance,
      postContact, cushions:this.cushions, collisions:this.collisions,
      firstObject:this.firstObject, potted:this.potted.size};
  }

  toCSV() {
    const lines = ['scenario,ball,time_s,x_m,z_m,speed_m_s,omega_x_rad_s,omega_y_rad_s,omega_z_rad_s,power_pct,tip_x,tip_y,elevation_deg,aim_x,aim_z,cushion_model'];
    for (const [num, path] of this.points) for (const point of path) {
      lines.push([this.label,num,point.t.toFixed(4),point.x.toFixed(5),
        point.z.toFixed(5),point.speed.toFixed(5),point.wx.toFixed(4),
        point.wy.toFixed(4),point.wz.toFixed(4),this.settings.power,
        this.settings.tipX.toFixed(3),this.settings.tipY.toFixed(3),
        this.settings.elevation,this.aim.x.toFixed(5),this.aim.z.toFixed(5),
        this.settings.cushionModel].join(','));
    }
    return lines.join('\n') + '\n';
  }
}

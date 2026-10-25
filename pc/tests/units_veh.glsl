// ---- новая техника v6 (vehicles2.js): gV = вид (1 рейдер, 2 РСЗО, 3 миномёт/катапульта) + дробная часть*2 — подъём / рычаг
// gProg — заряжено (0..1), gTh — нитро/выхлоп (рейдер), положение ствола/бомба в ковше (миномёт/катапульта)
float sdWheel(vec3 w, float R, float W, float knob){
  float a = atan(w.y, w.z) + gPh * 1.5;
  float r = length(w.yz) - R - knob * smoothstep(-0.35, 0.35, sin(a * 9.0));
  vec2 d = vec2(r, abs(w.x) - W);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
vec2 sdRaider(vec3 q){
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z), qa = vec3(abs(q.x), q.y, abs(q.z));
  if (gTeam < 0.5){
    // «Шакал»: багги с каркасом, водитель-робот, ракетный блок на корме
    float hull = sdRBox(q - vec3(0.0, 0.8, 0.05), vec3(0.72, 0.24, 1.5), 0.1);
    hull = max(hull, dot(q - vec3(0.0, 0.95, 1.1), vec3(0.0, 0.83, 0.55)));
    U(r, hull, 40.0);
    U(r, sdRBox(q - vec3(0.0, 0.64, 1.62), vec3(0.62, 0.11, 0.08), 0.03), 3.0);
    U(r, sdCapsule(qs, vec3(0.58, 1.0, 0.3), vec3(0.47, 1.72, -0.02), 0.045), 3.0);
    U(r, sdCapsule(qs, vec3(0.6, 1.0, -0.95), vec3(0.47, 1.68, -0.72), 0.045), 3.0);
    U(r, sdCapsule(qs, vec3(0.47, 1.72, -0.02), vec3(0.47, 1.68, -0.72), 0.045), 3.0);
    U(r, sdCapsule(qs, vec3(0.0, 1.73, -0.02), vec3(0.47, 1.72, -0.02), 0.045), 3.0);
    U(r, sdRBox(q - vec3(0.0, 1.17, -0.4), vec3(0.2, 0.17, 0.13), 0.05), 2.0);
    U(r, sdRBox(q - vec3(0.0, 1.47, -0.38), vec3(0.11, 0.1, 0.12), 0.04), 1.0);
    U(r, sdBox(q - vec3(0.0, 1.48, -0.26), vec3(0.08, 0.022, 0.012)), 4.0);
    U(r, length(qs - vec3(0.46, 0.92, 1.5)) - 0.09, 6.0);
    U(r, sdCylZ(q - vec3(0.0, 1.05, -1.62), 0.36, 0.09), 8.0);
    U(r, sdCapsule(q, vec3(-0.6, 1.0, -1.3), vec3(-0.66, 2.5, -1.42), 0.016), 3.0);
    U(r, sdCylZ(qs - vec3(0.32, 0.72, -1.58), 0.07, 0.08), 7.0);
    vec3 w = qa - vec3(0.98, 0.5, 1.0);
    U(r, sdWheel(w, 0.46, 0.17, 0.04), 8.0);
    U(r, sdCylX(w - vec3(0.08, 0.0, 0.0), 0.2, 0.1), 5.0);
    U(r, sdCapsule(qa, vec3(0.55, 0.7, 1.0), vec3(0.92, 0.5, 1.0), 0.055), 3.0);
  } else {
    // «Оса» Роя: стреловидный ховер-байк, жвалы, шипы на хребте, красные дюзы снизу
    vec3 h = q - vec3(0.0, 1.0, 0.1);
    float hull = sdRBox(h, vec3(0.72, 0.24, 1.65), 0.2);
    hull = max(hull, dot(vec2(abs(h.x), h.z), normalize(vec2(1.0, 0.42))) - 0.98);
    U(r, hull, 40.0);
    U(r, sdRBox(q - vec3(0.0, 1.3, -0.3), vec3(0.28, 0.13, 0.95), 0.11), 2.0);
    vec3 sp = q - vec3(0.0, 1.42, -0.3); sp.z -= clamp(floor(sp.z / 0.55 + 0.5), -1.0, 1.0) * 0.55;
    U(r, sdCapsule(sp, vec3(0.0), vec3(0.0, 0.3, -0.25), 0.05), 5.0);
    U(r, sdCapsule(qs, vec3(0.3, 0.88, 1.4), vec3(0.14, 0.7, 2.3), 0.06), 5.0);
    U(r, length(qs - vec3(0.17, 1.17, 1.4)) - 0.07, 4.0);
    U(r, length(qs - vec3(0.34, 1.08, 1.25)) - 0.05, 4.0);
    // ховер-гондолы с горячими дюзами
    vec3 g = qa - vec3(0.85, 0.62, 1.05);
    U(r, sdRBox(g, vec3(0.2, 0.17, 0.5), 0.15), 1.0);
    U(r, sdCylY(g + vec3(0.0, 0.17, 0.0), 0.16, 0.03), 42.0);
  }
  // ракетный блок с пулемётом
  vec3 t = q - vec3(0.0, gTeam < 0.5 ? 1.38 : 1.55, -0.95);
  U(r, sdCylY(t + vec3(0.0, 0.1, 0.0), 0.2, 0.12), 3.0);
  t.xz = r2(t.xz, gYaw); t.zy = r2(t.zy, -gPitch);
  t.y -= 0.2;
  if (gTeam < 0.5){
    U(r, sdRBox(t, vec3(0.34, 0.27, 0.52), 0.05), 40.0);
    vec3 tb = vec3(abs(t.x) - 0.15, abs(t.y) - 0.12, t.z - 0.5);
    U(r, sdCylZ(tb, 0.1, 0.06), 3.0);
    if (gProg > 0.98) U(r, length(tb - vec3(0.0, 0.0, 0.03)) - 0.075, 41.0);
    U(r, sdCylZ(t - vec3(0.44, -0.12, 0.3), 0.035, 0.42), 5.0);
  } else {
    U(r, sdRBox(t, vec3(0.3, 0.24, 0.62), 0.2), 1.0);
    vec3 tb = vec3(abs(t.x) - 0.13, t.y, t.z - 0.6);
    U(r, length(tb) - (gProg > 0.98 ? 0.11 : 0.06), 42.0);
    U(r, sdCylZ(t - vec3(0.0, -0.2, 0.5), 0.03, 0.38), 5.0);
  }
  return r;
}
vec2 sdMLRS(vec3 q, float el){
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z);
  if (gTeam < 0.5){
    // «Град»: трёхосный грузовик, бронекабина, пакет из трёх больших труб
    U(r, sdRBox(q - vec3(0.0, 1.42, 1.45), vec3(0.82, 0.55, 0.6), 0.12), 40.0);
    U(r, sdBox(q - vec3(0.0, 1.66, 2.06), vec3(0.62, 0.11, 0.02)), 3.0);
    U(r, length(qs - vec3(0.22, 1.66, 2.09)) - 0.035, 4.0);
    U(r, sdRBox(q - vec3(0.0, 0.98, -0.45), vec3(0.86, 0.22, 1.65), 0.08), 1.0);
    U(r, length(qs - vec3(0.6, 1.05, 2.06)) - 0.09, 6.0);
    U(r, sdRBox(qs - vec3(0.92, 1.3, -0.25), vec3(0.06, 0.16, 0.9), 0.03), 2.0);
    U(r, sdCapsule(q, vec3(-0.6, 1.95, 1.2), vec3(-0.66, 3.2, 1.1), 0.016), 3.0);
  } else {
    // «Улей» Роя: хитиновый панцирь, жвалы, сотовый пакет
    U(r, sdRBox(q - vec3(0.0, 1.25, 0.6), vec3(0.85, 0.48, 1.4), 0.45), 40.0);
    U(r, length(qs - vec3(0.25, 1.38, 1.98)) - 0.09, 4.0);
    U(r, length(qs - vec3(0.45, 1.25, 1.88)) - 0.07, 4.0);
    U(r, sdCapsule(qs, vec3(0.35, 0.85, 1.9), vec3(0.18, 0.6, 2.55), 0.07), 5.0);
    U(r, sdRBox(q - vec3(0.0, 0.98, -0.75), vec3(0.8, 0.22, 1.15), 0.15), 2.0);
  }
  vec3 w = vec3(abs(q.x) - 0.98, q.y - 0.52, q.z + 0.1);
  w.z -= clamp(floor(w.z / 1.3 + 0.5), -1.0, 1.0) * 1.3;
  U(r, sdWheel(w, 0.5, 0.18, gTeam < 0.5 ? 0.03 : 0.06), 8.0);
  U(r, sdCylX(w - vec3(0.1, 0.0, 0.0), 0.2, 0.1), gTeam < 0.5 ? 5.0 : 2.0);
  // поворотный круг, пусковая на оси подъёма
  vec3 t = q - vec3(0.0, 1.27, -0.75);
  U(r, sdCylY(t, 0.62, 0.1), 3.0);
  t.xz = r2(t.xz, gYaw);
  U(r, sdCapsule(vec3(abs(t.x), t.y, t.z), vec3(0.45, 0.0, -0.55), vec3(0.45, 0.3, -0.55), 0.09), 3.0);
  vec3 p = t - vec3(0.0, 0.32, -0.55);
  p.zy = r2(p.zy, -el);
  vec3 b = p - vec3(0.0, 0.42, 0.95);
  U(r, sdCapsule(vec3(abs(t.x), t.y, t.z), vec3(0.3, 0.05, 0.4), vec3(0.3, 0.32, -0.55) + vec3(0.0, sin(el), cos(el)) * 0.9, 0.06), 5.0);
  if (gTeam < 0.5){
    U(r, sdRBox(b, vec3(0.76, 0.34, 1.15), 0.05), 40.0);
    vec3 tb = b - vec3(0.0, 0.0, 1.15);
    float ix = clamp(floor(tb.x / 0.48 + 0.5), -1.0, 1.0);
    tb.x -= ix * 0.48;
    U(r, sdCylZ(tb, 0.2, 0.05), 3.0);
    if (gProg * 3.0 > ix + 1.5) U(r, length(tb) - 0.16, 41.0);
  } else {
    U(r, sdRBox(b, vec3(0.7, 0.42, 1.0), 0.32), 1.0);
    vec3 tb = b - vec3(0.0, 0.0, 1.05);
    float ix = clamp(floor(tb.x / 0.38 + 0.5), -1.0, 1.0), iy = tb.y > 0.0 ? 1.0 : 0.0;
    tb.x -= ix * 0.38; tb.y = abs(tb.y) - 0.18;
    float k = ix + 1.0 + iy * 3.0;
    U(r, length(tb) - (gProg * 6.0 > k + 0.5 ? 0.13 : 0.07), 42.0);
    vec3 rb = b; rb.z -= clamp(floor(rb.z / 0.45 + 0.5), -1.0, 1.0) * 0.45;
    U(r, max(sdBox(rb, vec3(0.74, 0.46, 0.04)), -sdBox(b, vec3(0.6, 0.3, 2.0))), 2.0);
  }
  return r;
}
// миномёт «Молот» (Консорциум) / катапульта «Требушет» (Рой)
vec2 sdCat(vec3 q, float f){
  vec2 r = vec2(1e5, 0.0);
  vec3 qs = vec3(abs(q.x), q.y, q.z);
  if (gTeam < 0.5){
    U(r, sdRBox(q - vec3(0.0, 0.95, 0.05), vec3(0.78, 0.3, 1.5), 0.1), 40.0);
    vec3 tr = qs - vec3(0.95, 0.5, 0.0);
    U(r, sdRBox(tr, vec3(0.22, 0.42, 1.62), 0.38), 8.0);
    vec3 rw = tr; rw.z -= clamp(floor(rw.z / 0.75 + 0.5), -2.0, 2.0) * 0.75;
    U(r, sdCylX(rw - vec3(0.12, 0.0, 0.0), 0.27, 0.12), 3.0);
    U(r, sdRBox(q - vec3(0.0, 1.32, 1.2), vec3(0.6, 0.14, 0.38), 0.05), 2.0);
    U(r, length(qs - vec3(0.5, 1.12, 1.6)) - 0.08, 6.0);
    U(r, sdRBox(qs - vec3(0.5, 1.4, -1.15), vec3(0.18, 0.18, 0.22), 0.04), 2.0);   // ящики с минами
    // поворотная платформа, плита-опора, ствол миномёта
    vec3 t = q - vec3(0.0, 1.3, -0.15);
    U(r, sdCylY(t, 0.68, 0.08), 3.0);
    t.xz = r2(t.xz, gYaw);
    U(r, sdCapsule(vec3(abs(t.x), t.y, t.z), vec3(0.32, 0.0, 0.2), vec3(0.2, 0.55, 0.05), 0.06), 3.0);
    vec3 m = t - vec3(0.0, 0.5, 0.0);
    float a = 0.8 + 0.6 * f;                       // подъём ствола
    m.zy = r2(m.zy, -a);
    float kick = gTh * 0.25;                       // откат после выстрела
    U(r, sdCylZ(m - vec3(0.0, 0.0, 0.75 - kick), 0.19, 0.95), 40.0);
    U(r, sdCylZ(m - vec3(0.0, 0.0, 1.7 - kick), 0.23, 0.07), 3.0);
    U(r, sdCylZ(m - vec3(0.0, 0.0, 1.0 - kick), 0.24, 0.05), 3.0);
    U(r, sdCylX(m, 0.14, 0.32), 5.0);
  } else {
    // «Требушет»: хитиновый корпус и хвост-рычаг скорпиона с горящим мешком-бомбой
    U(r, sdRBox(q - vec3(0.0, 1.05, 0.2), vec3(0.85, 0.38, 1.45), 0.36), 40.0);
    U(r, length(qs - vec3(0.25, 1.15, 1.72)) - 0.08, 4.0);
    U(r, length(qs - vec3(0.45, 1.05, 1.6)) - 0.06, 4.0);
    // клешни
    U(r, sdCapsule(qs, vec3(0.5, 0.9, 1.5), vec3(0.75, 0.75, 2.2), 0.1), 1.0);
    U(r, sdCapsule(qs, vec3(0.75, 0.75, 2.2), vec3(0.45, 0.7, 2.75), 0.08), 5.0);
    U(r, sdCapsule(qs, vec3(0.75, 0.75, 2.2), vec3(0.62, 0.95, 2.7), 0.06), 5.0);
    vec3 w = vec3(abs(q.x) - 0.95, q.y - 0.47, abs(q.z - 0.2) - 0.85);
    U(r, sdWheel(w, 0.45, 0.17, 0.07), 8.0);
    U(r, sdRBox(vec3(abs(q.x) - 0.95, q.y - 0.95, abs(q.z - 0.2) - 0.85), vec3(0.25, 0.06, 0.5), 0.04), 1.0);
    vec3 t = q - vec3(0.0, 1.35, -0.6);
    t.xz = r2(t.xz, gYaw);
    float b1 = mix(-0.55, 0.25, f), b2 = mix(0.95, 0.6, f), b3 = mix(1.35, 0.75, f);
    vec3 p0 = vec3(0.0, 0.0, -0.3);
    vec3 p1 = p0 + vec3(0.0, cos(b1), sin(b1)) * 1.0;
    vec3 p2 = p1 + vec3(0.0, cos(b1 + b2), sin(b1 + b2)) * 0.9;
    vec3 p3 = p2 + vec3(0.0, cos(b1 + b2 + b3), sin(b1 + b2 + b3)) * 0.75;
    U(r, sdCapsule(t, p0, p1, 0.21), 40.0);
    U(r, sdCapsule(t, p1, p2, 0.18), 40.0);
    U(r, sdCapsule(t, p2, p3, 0.15), 40.0);
    U(r, length(t - p1) - 0.25, 1.0);
    U(r, length(t - p2) - 0.21, 1.0);
    vec3 sd = vec3(0.0, cos(b1 + b2 + b3 + 0.9), sin(b1 + b2 + b3 + 0.9));
    U(r, sdCapsule(t, p3, p3 + sd * 0.75, 0.05), 5.0);          // жало
    U(r, length(t - p3 + sd * 0.15) - (gTh > 0.5 ? 0.34 : 0.17), gTh > 0.5 ? 42.0 : 1.0);
  }
  return r;
}
vec2 sdVeh2(vec3 q){
  float k = floor(gV + 0.01), f = (gV - k) * 2.0;
  if (k < 1.5) return sdRaider(q);
  if (k < 2.5) return sdMLRS(q, f);
  return sdCat(q, f);
}


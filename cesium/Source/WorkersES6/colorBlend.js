function n(n, r, t) {
return {
r: 255 * t(n.r / 255, r.r / 255),
g: 255 * t(n.g / 255, r.g / 255),
b: 255 * t(n.b / 255, r.b / 255)
}
}
function r(n, r) {
return r
}
function t(n, r) {
return n * r
}
function u(n, r) {
return n + r - n * r
}
function o(n, r) {
return f(r, n)
}
function e(n, r) {
return Math.min(n, r)
}
function i(n, r) {
return Math.min(Math.max(n, r), 1)
}
function c(n, r) {
return 0 === n ? 0 : 1 === r ? 1 : Math.min(1, n / (1 - r))
}
function a(n, r) {
return 1 === n ? 1 : 0 === r ? 0 : 1 - Math.min(1, (1 - n) / r)
}
function f(n, r) {
return r <= .5 ? t(n, 2 * r) : u(n, 2 * r - 1)
}
function g(n, r) {
return r <= .5 ? n - (1 - 2 * r) * n * (1 - n) : n + (2 * r - 1) * ((n <= .25 ? ((16 * n - 12) * n + 4) * n: Math.sqrt(n)) - n)
}
function b(n, r) {
return Math.abs(n - r)
}
function p(n, r) {
return n + r - 2 * n * r
}
function s(n, r, t) {
return Math.min(Math.max(n || 0, r), t)
}
function h(n) {
return {
r: s(n.r, 0, 255),
g: s(n.g, 0, 255),
b: s(n.b, 0, 255),
a: s(n.a, 0, 1)
}
}
function x(n) {
return {
r: 255 * n.r,
g: 255 * n.g,
b: 255 * n.b,
a: n.a
}
}
function M(n) {
return {
r: n.r / 255,
g: n.g / 255,
b: n.b / 255,
a: n.a
}
}
function m(n, r) {
void 0 === r && (r = 0);
var t = Math.pow(10, r);
return {
r: Math.round(n.r * t) / t,
g: Math.round(n.g * t) / t,
b: Math.round(n.b * t) / t,
a: n.a
}
}
function d(n, r, t, u, o, e) {
return (1 - r / t) * u + r / t * Math.round((1 - n) * o + n * e)
}
function l(n, r, t, u, o) {
void 0 === o && (o = {
unitInput: !1,
unitOutput: !1,
roundOutput: !0
}),
o.unitInput && (n = x(n), r = x(r)),
n = h(n);
var e = (r = h(r)).a + n.a - r.a * n.a,
i = t(n, r, u),
c = h({
r: d(n.a, r.a, e, n.r, r.r, i.r),
g: d(n.a, r.a, e, n.g, r.g, i.g),
b: d(n.a, r.a, e, n.b, r.b, i.b),
a: e
});
return o.unitOutput ? M(c) : o.roundOutput ? m(c) : m(c, 9)
}
function v(n, r, t) {
return x(t(M(n), M(r)))
}
function O(n) {
return.3 * n.r + .59 * n.g + .11 * n.b
}
function y(n, r) {
var t = r - O(n);
return function(n) {
var r = O(n),
t = n.r,
u = n.g,
o = n.b,
e = Math.min(t, u, o),
i = Math.max(t, u, o);
function c(n) {
return r + (n - r) * r / (r - e)
}
function a(n) {
return r + (n - r) * (1 - r) / (i - r)
}
return e < 0 && (t = c(t), u = c(u), o = c(o)),
i > 1 && (t = a(t), u = a(u), o = a(o)),
{
r: t,
g: u,
b: o
}
} ({
r: n.r + t,
g: n.g + t,
b: n.b + t
})
}
function I(n) {
return Math.max(n.r, n.g, n.b) - Math.min(n.r, n.g, n.b)
}
function L(n, r) {
var t = ["r", "g", "b"].sort(function(r, t) {
return n[r] - n[t]
}),
u = t[0],
o = t[1],
e = t[2],
i = {
r: n.r,
g: n.g,
b: n.b
};
return i[e] > i[u] ? (i[o] = (i[o] - i[u]) * r / (i[e] - i[u]), i[e] = r) : i[o] = i[e] = 0,
i[u] = 0,
i
}
function k(n, r) {
return y(L(r, I(n)), O(n))
}
function q(n, r) {
return y(L(n, I(r)), O(n))
}
function w(n, r) {
return y(r, O(n))
}
function B(n, r) {
return y(n, O(r))
}
let color = function(n, r) {
return l(n, r, v, w)
}
let colorBurn = function(r, t) {
return l(r, t, n, a)
}
let colorDodge = function(r, t) {
return l(r, t, n, c)
}
let darken = function(r, t) {
return l(r, t, n, e)
}
let difference = function(r, t) {
return l(r, t, n, b)
}
let exclusion = function(r, t) {
return l(r, t, n, p)
}
let hardLight = function(r, t) {
return l(r, t, n, f)
}
let hue = function(n, r) {
return l(n, r, v, k)
}
let lighten = function(r, t) {
return l(r, t, n, i)
}
let luminosity = function(n, r) {
return l(n, r, v, B)
}
let multiply = function(r, u) {
return l(r, u, n, t)
}
let normal = function(t, u) {
return l(t, u, n, r)
}
let overlay = function(r, t) {
return l(r, t, n, o)
}
let saturation = function(n, r) {
return l(n, r, v, q)
}
let screen = function(r, t) {
return l(r, t, n, u)
}
let softLight = function(r, t) {
return l(r, t, n, g)
};

export default {color,colorBurn,colorDodge,darken,difference,exclusion,hardLight,hue,lighten,
    luminosity,multiply,normal,overlay,saturation,screen,softLight};
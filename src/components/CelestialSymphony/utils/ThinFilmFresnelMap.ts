import * as THREE from 'three';

// From: https://github.com/DerSchmale/threejs-thin-film-iridescence
// Author: David Lenaerts <https://www.davelenaerts.com/>

const c0 = new THREE.Vector3();
const c1 = new THREE.Vector3();
const c2 = new THREE.Vector3();
const c3 = new THREE.Vector3();
const c4 = new THREE.Vector3();
const c5 = new THREE.Vector3();

// Based on "An Inexpensive BRDF Model for Physically-Based Rendering" by Christophe Schlick
function schlick(f0: number, f90: number, v_dot_h: number) {
  return f0 + (f90 - f0) * Math.pow(1.0 - v_dot_h, 5.0);
}

// Based on "A Fast and Simple Skin-Shader for Videogames" by Christian Schüler
function fresnelToIor(f: number) {
  return (1.0 + Math.sqrt(f)) / (1.0 - Math.sqrt(f));
}

function iorToFresnel(ior: number) {
  const f = (ior - 1.0) / (ior + 1.0);
  return f * f;
}

// Based on "A Practical Extension to Microfacet Theory for the Modeling of Varying Iridescence" by Belcour and Barla
function evalFilm(
  thickness: number,
  cos_theta: number,
  eta: number,
  lambda: THREE.Vector3
) {
  const sin_theta_t_sq = (Math.sin(Math.acos(cos_theta)) / eta) ** 2;
  const cos_theta_t = Math.sqrt(1.0 - sin_theta_t_sq);

  const R12 = iorToFresnel((eta - 1.0) / (eta + 1.0));
  const R23 = iorToFresnel((eta - 1.0) / (eta + 1.0)); // Assuming substrate is air
  const T121 = schlick(1.0 - R12, 1.0 - R12, 1.0);
  const R21 = R12;
  const T212 = T121;

  const D = (2.0 * Math.PI * thickness) / lambda.x;
  const phi = D * cos_theta_t;

  const I1 = R12;
  const I2 = T121 * T212 * R23;

  const r12 = Math.sqrt(I1);
  const r23 = Math.sqrt(R23);
  const t121 = Math.sqrt(T121);
  const t212 = Math.sqrt(T212);
  const r21 = -r12;

  const C1 = r12;
  const C2 = t121 * r23 * t212;
  const C3 = t121 * r23 * r21 * r23 * t212;
  const C4 = t121 * r23 * r21 * r23 * r21 * r23 * t212;

  c0.set(
    I1 + I2 / (1.0 - R21 * R23),
    I1 + I2 / (1.0 - R21 * R23),
    I1 + I2 / (1.0 - R21 * R23)
  );

  const cos_2phi = Math.cos(2.0 * phi);
  c1.set(cos_2phi, cos_2phi, cos_2phi);
  c2.multiplyVectors(C1, C2).multiplyScalar(2.0);

  const cos_4phi = Math.cos(4.0 * phi);
  c3.set(cos_4phi, cos_4phi, cos_4phi);
  c4.multiplyVectors(C1, C3).multiplyScalar(2.0);
  c5.multiplyVectors(C2, C2);

  let result = new THREE.Vector3();
  result.add(c2.multiply(c1));
  result.add(c4.multiply(c3));
  result.add(c5);
  result.add(c0);
  return result;
}

export class ThinFilmFresnelMap {
  public texture: THREE.DataTexture;
  private _filmThickness: number;
  private _filmIor: number;
  private _substrateIor: number;
  private _size: number;
  private _data: Uint8Array;

  constructor(
    filmThickness = 380.0,
    filmIor = 1.4,
    substrateIor = 2.7,
    size = 256
  ) {
    this._filmThickness = filmThickness;
    this._filmIor = filmIor;
    this._substrateIor = substrateIor;
    this._size = size;

    this._data = new Uint8Array(this._size * 4);
    this.texture = new THREE.DataTexture(
      this._data,
      this._size,
      1,
      THREE.RGBAFormat
    );
    this.texture.needsUpdate = true;
    this.update();
  }

  update() {
    const filmEta = this._filmIor;
    const substrateEta = this._substrateIor;
    const size = this._size;

    for (let i = 0; i < size; i++) {
      const cos_theta = i / (size - 1);
      const lambda = new THREE.Vector3(700.0, 550.0, 440.0); // RGB wavelengths

      const reflectance = evalFilm(
        this._filmThickness,
        cos_theta,
        filmEta / substrateEta,
        lambda
      );
      this._data[i * 4 + 0] = Math.min(255, reflectance.x * 255);
      this._data[i * 4 + 1] = Math.min(255, reflectance.y * 255);
      this._data[i * 4 + 2] = Math.min(255, reflectance.z * 255);
      this._data[i * 4 + 3] = 255;
    }

    this.texture.needsUpdate = true;
  }
}

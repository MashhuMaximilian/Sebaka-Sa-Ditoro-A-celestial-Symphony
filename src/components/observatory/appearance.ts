// Visual treatments only. None of these shaders changes the ephemeris,
// apparent-disc calculation, or the canonical 27-day Viridis cycle.
export const noiseGLSL = `
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.01)*.17;}
`;

export const surfaceVertex = `
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vObject;
void main(){vUv=uv;vObject=position;vNormal=normalize(mat3(modelMatrix)*normal);
vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const surfaceFragment = `precision highp float;
uniform sampler2D surface;
uniform vec3 sunA, sunB, tint;
uniform float hasTexture, star, cycle, time, volcanic;
varying vec2 vUv; varying vec3 vNormal, vWorld, vObject;
${noiseGLSL}
void main(){
 vec3 n=normalize(vNormal), eye=normalize(cameraPosition-vWorld);
 float mu=max(dot(n,eye),0.);
 if(star>.5){
   // Resolved photosphere: small convection cells, cool spots and limb darkening.
   vec3 p=normalize(vObject);
   float granules=noise(p*155.+vec3(time*.025));
   float convection=fbm(p*29.+vec3(0.,time*.008,0.));
   float field=fbm(p*12.+vec3(1.7,0.,0.));
   float spots=smoothstep(.75,.82,field), penumbra=smoothstep(.69,.77,field);
   float limb=.48+.52*pow(mu,.45);
   vec3 color=mix(tint,vec3(1.,.98,.92),.45);
   color*=limb*(.76+.24*granules)*(.88+.12*convection)*(1.-.45*spots-.15*penumbra);
   gl_FragColor=vec4(color*1.3,1.);
 }else{
   vec3 tex=mix(tint,texture2D(surface,vUv).rgb,hasTexture);
   float a=max(dot(n,normalize(sunA-vWorld)),0.);
   float b=max(dot(n,normalize(sunB-vWorld)),0.);
   float rim=pow(1.-mu,4.);
   vec3 light=tex*(.065+a*.98+b*.35)+tint*rim*.20*max(a,b);
   if(volcanic>.5){
     vec3 p=normalize(vObject);
     float fissure=1.-smoothstep(.012,.05,abs(fbm(p*24.)-.53));
     float vents=smoothstep(.59,.76,fbm(p*11.+vec3(0.,time*.012,0.)));
     float lava=(fissure*.5+vents)*(.12+cycle*.88);
     light+=vec3(1.,.19,.025)*lava*.95;
     float ash=smoothstep(.55,.8,fbm(p*7.+vec3(time*.006,0.,0.)));
     light=mix(light,light*.45,ash*(1.-cycle)*.45);
   }
   gl_FragColor=vec4(light,1.);
 }
 #include <colorspace_fragment>
}`;

export const ringVertex = `varying vec3 p, world, norm;
void main(){p=position;world=(modelMatrix*vec4(position,1.)).xyz;
norm=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const ringFragment = `precision highp float;
uniform float iridescent; varying vec3 p, world, norm;
void main(){
 float r=length(p.xy), angle=atan(p.y,p.x);
 float facing=abs(dot(normalize(norm),normalize(cameraPosition-world)));
 float phase=r*7.5+angle*.12+(1.-facing)*5.;
 vec3 pearl=.56+.35*cos(phase+vec3(0.,2.1,4.2));
 vec3 color=mix(vec3(.74,.69,.57),pearl,iridescent*.88);
 // Suppress subpixel bands to avoid shimmer while zoomed out.
 float attenuation=1.-smoothstep(.012,.055,fwidth(r));
 float bands=.65+attenuation*(.16*sin(r*145.)+.12*sin(r*63.)+.07*sin(r*321.));
 float gap=1.-smoothstep(.035,.055,abs(r-2.05));
 float edges=smoothstep(1.35,1.42,r)*(1.-smoothstep(2.87,3.,r));
 gl_FragColor=vec4(color*(.85+.3*(1.-facing)),bands*edges*(1.-gap*.95)*.83);
 #include <colorspace_fragment>
}`;

export const starPointVertex = `attribute float magnitude; varying vec3 c;
uniform float pixelRatio;
void main(){c=color;gl_PointSize=(1.1+magnitude*4.2)*pixelRatio;
gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const starPointFragment = `precision highp float; varying vec3 c;
uniform float visibility;
void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
float core=exp(-d*d*16.), halo=exp(-d*d*4.)*.18;
gl_FragColor=vec4(c,(core+halo)*visibility);
#include <colorspace_fragment>
}`;

import{r as R}from"./ProjectReportDialog-DJSS4N_t.js";import{g as j,b as w,u as N,s as y,c as U,a as E,m as P}from"./DefaultPropsProvider-Bua-nAaA.js";import{c as F,d as S,k as b}from"./Typography-D7k_4FBJ.js";import{j as f}from"./index-BgEJ3fxA.js";import{b as n}from"./createTheme-C_kE-Qd2.js";function I(e){return w("MuiCircularProgress",e)}const H=j("MuiCircularProgress",["root","determinate","indeterminate","colorPrimary","colorSecondary","svg","circle","circleDeterminate","circleIndeterminate","circleDisableShrink"]),t=44,g=b`
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
`,h=b`
  0% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: 0;
  }

  50% {
    stroke-dasharray: 100px, 200px;
    stroke-dashoffset: -15px;
  }

  100% {
    stroke-dasharray: 1px, 200px;
    stroke-dashoffset: -126px;
  }
`,z=typeof g!="string"?S`
        animation: ${g} 1.4s linear infinite;
      `:null,A=typeof h!="string"?S`
        animation: ${h} 1.4s ease-in-out infinite;
      `:null,K=e=>{const{classes:r,variant:s,color:a,disableShrink:c}=e,l={root:["root",s,`color${n(a)}`],svg:["svg"],circle:["circle",`circle${n(s)}`,c&&"circleDisableShrink"]};return E(l,I,r)},V=y("span",{name:"MuiCircularProgress",slot:"Root",overridesResolver:(e,r)=>{const{ownerState:s}=e;return[r.root,r[s.variant],r[`color${n(s.color)}`]]}})(P(({theme:e})=>({display:"inline-block",variants:[{props:{variant:"determinate"},style:{transition:e.transitions.create("transform")}},{props:{variant:"indeterminate"},style:z||{animation:`${g} 1.4s linear infinite`}},...Object.entries(e.palette).filter(F()).map(([r])=>({props:{color:r},style:{color:(e.vars||e).palette[r].main}}))]}))),B=y("svg",{name:"MuiCircularProgress",slot:"Svg"})({display:"block"}),G=y("circle",{name:"MuiCircularProgress",slot:"Circle",overridesResolver:(e,r)=>{const{ownerState:s}=e;return[r.circle,r[`circle${n(s.variant)}`],s.disableShrink&&r.circleDisableShrink]}})(P(({theme:e})=>({stroke:"currentColor",variants:[{props:{variant:"determinate"},style:{transition:e.transitions.create("stroke-dashoffset")}},{props:{variant:"indeterminate"},style:{strokeDasharray:"80px, 200px",strokeDashoffset:0}},{props:({ownerState:r})=>r.variant==="indeterminate"&&!r.disableShrink,style:A||{animation:`${h} 1.4s ease-in-out infinite`}}]}))),J=R.forwardRef(function(r,s){const a=N({props:r,name:"MuiCircularProgress"}),{className:c,color:l="primary",disableShrink:$=!1,size:m=40,style:D,thickness:o=3.6,value:p=0,variant:k="indeterminate",...M}=a,i={...a,color:l,disableShrink:$,size:m,thickness:o,value:p,variant:k},u=K(i),d={},v={},x={};if(k==="determinate"){const C=2*Math.PI*((t-o)/2);d.strokeDasharray=C.toFixed(3),x["aria-valuenow"]=Math.round(p),d.strokeDashoffset=`${((100-p)/100*C).toFixed(3)}px`,v.transform="rotate(-90deg)"}return f.jsx(V,{className:U(u.root,c),style:{width:m,height:m,...v,...D},ownerState:i,ref:s,role:"progressbar",...x,...M,children:f.jsx(B,{className:u.svg,ownerState:i,viewBox:`${t/2} ${t/2} ${t} ${t}`,children:f.jsx(G,{className:u.circle,style:d,ownerState:i,cx:t,cy:t,r:(t-o)/2,fill:"none",strokeWidth:o})})})});export{J as C,H as c,I as g};

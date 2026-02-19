import{G as v,I as i,P as s,ao as d,J as e,O as p,aB as c,aC as w,aD as m,N as n}from"./common.modules-dc3ca4c4.js";import{g as u,_ as f}from"./page-activity-ActivityDetail-fbbc8eb5.js";const r=t=>(w("data-v-d0cbe577"),t=t(),m(),t),g={class:"wallet_header"},h={key:0,class:"no_active"},C={class:"ar_logo"},A={class:"logo"},B=["src"],I={class:"ar_amount_txt"},W={class:"ar_amount"},V=r(()=>e("span",null,"ARB",-1)),k=r(()=>e("div",{class:"divider"},null,-1)),y=v({__name:"walletInfo",props:{isActive:{type:Boolean,default:!1},arWallet:{type:Object,default:()=>{}}},emits:["goWallet"],setup(t,{emit:_}){return(a,l)=>{var o;return n(),i("div",g,[t.isActive?d("v-if",!0):(n(),i("div",h,s(a.$t("arNoActive2")),1)),e("div",C,[e("div",A,[e("img",{src:p(u)("common","ar_wallet"),alt:""},null,8,B),c(" AR"+s(a.$t("wallet")),1)]),e("div",{class:"go_wallet",onClick:l[0]||(l[0]=b=>_("goWallet"))},s(a.$t("comminWallet")),1)]),e("div",I,s(a.$t("walletBalance")),1),e("div",W,[c(s(t.isActive?(o=t.arWallet)==null?void 0:o.balance:0)+" ",1),V]),k,d(` <div class="ar_address">
			<div class="ad_title">
				<div>{{$t('walletAddress')}}:</div>
				<div>{{ isActive? arWallet?.walletAddress : '' }} </div>
			</div>

			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16" fill="none" @click="copy(arWallet?.walletAddress)">
				<path
					fill-rule="evenodd"
					clip-rule="evenodd"
					d="M3.5 1.125C3.5 0.572716 3.94772 0.125 4.5 0.125H13C13.5523 0.125 14 0.572715 14 1.125V11.375C14 11.9273 13.5523 12.375 13 12.375H11.375V4.25C11.375 3.42157 10.7034 2.75 9.875 2.75H3.5V1.125ZM1 3.625C0.447715 3.625 0 4.07272 0 4.625V14.875C0 15.4273 0.447715 15.875 1 15.875H9.5C10.0523 15.875 10.5 15.4273 10.5 14.875V4.625C10.5 4.07272 10.0523 3.625 9.5 3.625H1Z"
					fill="#B6BAC5"
				/>
			</svg>
		</div> `)])}}});const N=f(y,[["__scopeId","data-v-d0cbe577"],["__file","/usr/local/jenkins-prod/workspace/AR015-Pages-india-bdgwin/src/views/arWallet/components/walletInfo.vue"]]);export{N as W};

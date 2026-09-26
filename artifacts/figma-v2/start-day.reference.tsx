const imgCompass = "https://www.figma.com/api/mcp/asset/fc761827-1526-481e-9ff7-aab10597ba3a.svg";
const imgSun = "https://www.figma.com/api/mcp/asset/56bc3794-45ee-4052-9c2a-26894d491cc4.svg";
const imgEllipse = "https://www.figma.com/api/mcp/asset/c4280a9d-0e61-4020-8796-316e638ecb82.svg";
const imgEllipse1 = "https://www.figma.com/api/mcp/asset/8c322b6b-d257-42bf-a157-bdae784a0821.svg";

export default function StartDay() {
  return (
    <div className="bg-[#0b0c0d] content-stretch flex flex-col items-start justify-between overflow-clip relative rounded-[24px] size-full" data-node-id="100:663" data-name="start-day">
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="100:664" data-name="scrollable-content">
        <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative shrink-0 w-full" data-node-id="100:665" data-name="app-header">
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:666" data-name="logo-group">
            <div className="bg-[rgba(216,185,120,0.1)] border border-[#d8b978] border-solid content-stretch flex flex-col items-center justify-center relative rounded-[16px] shrink-0 size-[32px]" data-node-id="100:667" data-name="logo">
              <div className="relative shrink-0 size-[18px]" data-node-id="100:668" data-name="compass">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCompass} />
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-px items-start leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-node-id="100:670" data-name="title-group">
              <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[16px]" data-node-id="100:671">
                Caminos
              </p>
              <p className="font-['Inter:Medium'] font-medium relative shrink-0 text-[#a6aaae] text-[10px]" data-node-id="100:672">
                by Morgan
              </p>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[20px] items-start p-[16px] relative shrink-0 w-full" data-node-id="100:673" data-name="content-body">
          <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0 w-full" data-node-id="100:674" data-name="start-day-intro">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:675" data-name="sun-badge">
              <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]" data-node-id="100:676" data-name="sun">
                <div className="relative shrink-0 size-[16px]" data-node-id="100:1253" data-name="sun">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSun} />
                </div>
              </div>
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[11px] uppercase whitespace-nowrap" data-node-id="100:678">
                Friday, Sep 19
              </p>
            </div>
            <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[22px] whitespace-nowrap" data-node-id="100:679">
              Good morning, Morgan.
            </p>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] min-w-full not-italic relative shrink-0 text-[#a6aaae] text-[14px] w-[min-content]" data-node-id="100:680">
              A quiet check-in before the world rushes in.
            </p>
          </div>
          <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[12px] items-start p-[16px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:681" data-name="wake-time-picker">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[13px] uppercase whitespace-nowrap" data-node-id="100:682">
              What time did you wake up?
            </p>
            <div className="content-stretch flex gap-[8px] items-center justify-center relative shrink-0 w-full" data-node-id="100:683" data-name="scroll-wheels">
              <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-node-id="100:684" data-name="wheel-column">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#34373a] text-[13px] whitespace-nowrap" data-node-id="100:685">
                  6
                </p>
                <div className="bg-[rgba(216,185,120,0.1)] content-stretch flex items-start px-[16px] py-[6px] relative rounded-[8px] shrink-0" data-node-id="100:686" data-name="active-hour">
                  <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[24px] whitespace-nowrap" data-node-id="100:687">
                    7
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#34373a] text-[13px] whitespace-nowrap" data-node-id="100:688">
                  8
                </p>
              </div>
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[24px] whitespace-nowrap" data-node-id="100:689">
                :
              </p>
              <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-node-id="100:690" data-name="wheel-column">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#34373a] text-[13px] whitespace-nowrap" data-node-id="100:691">
                  10
                </p>
                <div className="bg-[rgba(216,185,120,0.1)] content-stretch flex items-start px-[16px] py-[6px] relative rounded-[8px] shrink-0" data-node-id="100:692" data-name="active-minute">
                  <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[24px] whitespace-nowrap" data-node-id="100:693">
                    15
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#34373a] text-[13px] whitespace-nowrap" data-node-id="100:694">
                  20
                </p>
              </div>
              <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0" data-node-id="100:695" data-name="wheel-column">
                <div className="bg-[rgba(216,185,120,0.1)] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[8px] shrink-0" data-node-id="100:696" data-name="active-period">
                  <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[20px] whitespace-nowrap" data-node-id="100:697">
                    AM
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#34373a] text-[13px] whitespace-nowrap" data-node-id="100:698">
                  PM
                </p>
              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:699" data-name="quick-log-section">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[13px] uppercase whitespace-nowrap" data-node-id="100:700">
              A few quick notes (Optional)
            </p>
            <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[8px] items-start p-[12px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:701" data-name="mood-selector">
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:702">
                How are you feeling?
              </p>
              <div className="content-stretch flex items-start justify-between relative shrink-0 w-full" data-node-id="100:703" data-name="emojis">
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[20px] whitespace-nowrap" data-node-id="100:704">
                  😭
                </p>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[20px] whitespace-nowrap" data-node-id="100:705">
                  😔
                </p>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[20px] whitespace-nowrap" data-node-id="100:706">
                  😐
                </p>
                <div className="bg-[rgba(216,185,120,0.1)] border-[#d8b978] border-[1.5px] border-solid content-stretch flex items-start p-[4px] relative rounded-[12px] shrink-0" data-node-id="100:707" data-name="selected-emoji">
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[22px] text-black whitespace-nowrap" data-node-id="100:708">
                    🙂
                  </p>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[20px] whitespace-nowrap" data-node-id="100:709">
                  🤩
                </p>
              </div>
            </div>
            <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[8px] items-start p-[12px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:710" data-name="energy-level">
              <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 text-[11px] w-full whitespace-nowrap" data-node-id="100:711" data-name="Frame">
                <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#a6aaae]" data-node-id="100:712">
                  Energy level
                </p>
                <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#d8b978]" data-node-id="100:713">
                  3 of 5
                </p>
              </div>
              <div className="content-stretch flex gap-[8px] items-start justify-center relative shrink-0 w-full" data-node-id="100:714" data-name="dots-row">
                <div className="relative shrink-0 size-[12px]" data-node-id="100:715" data-name="Ellipse">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse} />
                </div>
                <div className="relative shrink-0 size-[12px]" data-node-id="100:716" data-name="Ellipse">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse} />
                </div>
                <div className="relative shrink-0 size-[12px]" data-node-id="100:717" data-name="Ellipse">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse} />
                </div>
                <div className="relative shrink-0 size-[12px]" data-node-id="100:718" data-name="Ellipse">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse1} />
                </div>
                <div className="relative shrink-0 size-[12px]" data-node-id="100:719" data-name="Ellipse">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgEllipse1} />
                </div>
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex gap-[8px] items-start leading-[normal] not-italic relative shrink-0 w-full whitespace-nowrap" data-node-id="100:720" data-name="weight-sleep-row">
              <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px p-[12px] relative rounded-[12px]" data-node-id="100:721" data-name="weight-card">
                <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#a6aaae] text-[11px]" data-node-id="100:722">
                  Morning weight
                </p>
                <div className="content-stretch flex gap-[4px] items-baseline relative shrink-0" data-node-id="100:723" data-name="Frame">
                  <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[18px]" data-node-id="100:724">
                    172
                  </p>
                  <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#a6aaae] text-[11px]" data-node-id="100:725">
                    lbs
                  </p>
                </div>
              </div>
              <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-w-px p-[12px] relative rounded-[12px]" data-node-id="100:726" data-name="sleep-card">
                <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#a6aaae] text-[11px]" data-node-id="100:727">
                  Sleep duration
                </p>
                <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[18px]" data-node-id="100:728">
                  7h 30m
                </p>
              </div>
            </div>
            <div className="[word-break:break-word] bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col font-['Inter:Regular'] font-normal gap-[4px] items-start leading-[normal] not-italic p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:729" data-name="note-card">
              <p className="relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:730">
                Morning note
              </p>
              <p className="min-w-full relative shrink-0 text-[#f4f2ed] text-[13px] w-[min-content]" data-node-id="100:731">
                Slept well, ready to go
              </p>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:732" data-name="actions">
            <div className="bg-[#d8b978] content-stretch flex items-start justify-center px-[16px] py-[14px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:733" data-name="start-btn">
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#0b0c0d] text-[14px] whitespace-nowrap" data-node-id="100:734">
                Start my day
              </p>
            </div>
            <p className="[text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] text-center underline w-full" data-node-id="100:735">
              Just record wake time
            </p>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col h-[24px] items-center justify-center relative shrink-0 w-full" data-node-id="100:736" data-name="safe-area">
        <div className="bg-[#34373a] h-[5px] relative rounded-[100px] shrink-0 w-[134px]" data-node-id="100:737" data-name="home-indicator" />
      </div>
    </div>
  );
}

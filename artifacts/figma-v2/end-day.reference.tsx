const imgCompass = "https://www.figma.com/api/mcp/asset/49e59e46-d908-44fe-b86b-8bb6773dd839.svg";
const imgMoon = "https://www.figma.com/api/mcp/asset/beaf8979-3b77-464e-872f-15752803a1c8.svg";
const imgSun = "https://www.figma.com/api/mcp/asset/77b37a09-d1d4-4e2f-8ce4-580efa8d3fa3.svg";
const imgCheckCircle = "https://www.figma.com/api/mcp/asset/ae69c511-0239-49d1-b24a-1c318446c117.svg";
const imgActivity = "https://www.figma.com/api/mcp/asset/21ff4740-e3d2-4744-a415-11895f152ce5.svg";
const imgClock = "https://www.figma.com/api/mcp/asset/62016b52-a296-4e60-8df5-b6f2c5352bfe.svg";
const imgCalendar = "https://www.figma.com/api/mcp/asset/1802778e-f8b1-4a09-a3c2-20766dd68f26.svg";
const imgToggle = "https://www.figma.com/api/mcp/asset/7a471aa0-23d5-4855-b517-9bff691157c2.svg";

export default function EndDay() {
  return (
    <div className="bg-[#0b0c0d] content-stretch flex flex-col items-start justify-between overflow-clip relative rounded-[24px] size-full" data-node-id="100:739" data-name="end-day">
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="100:740" data-name="scrollable-content">
        <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative shrink-0 w-full" data-node-id="100:741" data-name="app-header">
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:742" data-name="logo-group">
            <div className="bg-[rgba(216,185,120,0.1)] border border-[#d8b978] border-solid content-stretch flex flex-col items-center justify-center relative rounded-[16px] shrink-0 size-[32px]" data-node-id="100:743" data-name="logo">
              <div className="relative shrink-0 size-[18px]" data-node-id="100:744" data-name="compass">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCompass} />
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-px items-start leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-node-id="100:746" data-name="title-group">
              <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[16px]" data-node-id="100:747">
                Caminos
              </p>
              <p className="font-['Inter:Medium'] font-medium relative shrink-0 text-[#a6aaae] text-[10px]" data-node-id="100:748">
                by Morgan
              </p>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[20px] items-start p-[16px] relative shrink-0 w-full" data-node-id="100:749" data-name="content-body">
          <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-node-id="100:750" data-name="end-day-intro">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:751" data-name="moon-badge">
              <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]" data-node-id="100:752" data-name="moon">
                <div className="relative shrink-0 size-[16px]" data-node-id="100:1256" data-name="moon">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMoon} />
                </div>
              </div>
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[11px] uppercase whitespace-nowrap" data-node-id="100:754">
                Good evening, Morgan
              </p>
            </div>
            <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[22px] whitespace-nowrap" data-node-id="100:755">
              Wrapping up your day
            </p>
          </div>
          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="100:756" data-name="section-unresolved">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[13px] uppercase whitespace-nowrap" data-node-id="100:757">
              Unresolved tasks
            </p>
            <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[10px] items-start p-[12px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:758" data-name="task-card-1">
              <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 w-full whitespace-nowrap" data-node-id="100:759" data-name="Frame">
                <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[14px]" data-node-id="100:760">
                  Call dentist
                </p>
                <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#f59e0b] text-[11px]" data-node-id="100:761">
                  Snoozed twice
                </p>
              </div>
              <div className="content-stretch flex gap-[6px] items-start relative shrink-0 w-full" data-node-id="100:762" data-name="inline-decision-buttons">
                <div className="bg-[#34373a] content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[12px] py-[8px] relative rounded-[8px]" data-node-id="100:763" data-name="tomorrow-btn">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[11px] whitespace-nowrap" data-node-id="100:764">
                    Tomorrow
                  </p>
                </div>
                <div className="border border-[#34373a] border-solid content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[12px] py-[8px] relative rounded-[8px]" data-node-id="100:765" data-name="snooze-btn">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:766">
                    Snooze
                  </p>
                </div>
                <div className="border border-[#34373a] border-solid content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[12px] py-[8px] relative rounded-[8px]" data-node-id="100:767" data-name="drop-btn">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:768">
                    Drop
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[10px] items-start p-[12px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:769" data-name="task-card-2">
              <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 w-full whitespace-nowrap" data-node-id="100:770" data-name="Frame">
                <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[14px]" data-node-id="100:771">
                  Grocery list
                </p>
                <p className="font-['Inter:Regular'] font-normal relative shrink-0 text-[#a6aaae] text-[11px]" data-node-id="100:772">
                  Unscheduled
                </p>
              </div>
              <div className="content-stretch flex gap-[6px] items-start relative shrink-0 w-full" data-node-id="100:773" data-name="inline-decision-buttons">
                <div className="bg-[#34373a] content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[12px] py-[8px] relative rounded-[8px]" data-node-id="100:774" data-name="tomorrow-btn">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[11px] whitespace-nowrap" data-node-id="100:775">
                    Tomorrow
                  </p>
                </div>
                <div className="border border-[#34373a] border-solid content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[12px] py-[8px] relative rounded-[8px]" data-node-id="100:776" data-name="snooze-btn">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:777">
                    Snooze
                  </p>
                </div>
                <div className="border border-[#34373a] border-solid content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[12px] py-[8px] relative rounded-[8px]" data-node-id="100:778" data-name="drop-btn">
                  <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:779">
                    Drop
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="100:780" data-name="section-glance">
            <div className="[word-break:break-word] content-stretch flex items-center justify-between leading-[normal] not-italic relative shrink-0 w-full whitespace-nowrap" data-node-id="100:781" data-name="Frame">
              <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#a6aaae] text-[13px] uppercase" data-node-id="100:782">
                Your day at a glance
              </p>
              <p className="font-['Inter:Semi_Bold'] font-semibold relative shrink-0 text-[#d8b978] text-[11px]" data-node-id="100:783">
                Edit summary
              </p>
            </div>
            <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[10px] items-start p-[14px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:784" data-name="glance-summary">
              <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-node-id="100:785" data-name="Frame">
                <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]" data-node-id="100:786" data-name="sun">
                  <div className="relative shrink-0 size-[14px]" data-node-id="100:1259" data-name="sun">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgSun} />
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:788">
                  Woke at 7:15 AM · Mood: Good
                </p>
              </div>
              <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-node-id="100:789" data-name="Frame">
                <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]" data-node-id="100:790" data-name="check-circle">
                  <div className="relative shrink-0 size-[14px]" data-node-id="100:1262" data-name="check-circle">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCheckCircle} />
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:792">
                  4 of 6 tasks completed · 2 blocks on time
                </p>
              </div>
              <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-node-id="100:793" data-name="Frame">
                <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]" data-node-id="100:794" data-name="activity">
                  <div className="relative shrink-0 size-[14px]" data-node-id="100:1265" data-name="activity">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgActivity} />
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:796">
                  2,840 steps · 7h 30m sleep
                </p>
              </div>
              <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-node-id="100:797" data-name="Frame">
                <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[14px]" data-node-id="100:798" data-name="clock">
                  <div className="relative shrink-0 size-[14px]" data-node-id="100:1268" data-name="clock">
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgClock} />
                  </div>
                </div>
                <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:800">
                  Active for 14h 23m
                </p>
              </div>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="100:801" data-name="section-journal">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[13px] uppercase whitespace-nowrap" data-node-id="100:802">
              Journal
            </p>
            <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex h-[80px] items-start p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:803" data-name="textarea-box">
              <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[#a6aaae] text-[13px]" data-node-id="100:804">
                A few words, or a few paragraphs — whatever you need.
              </p>
            </div>
          </div>
          <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex items-center justify-between p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:805" data-name="section-tomorrow">
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:806" data-name="Frame">
              <div className="content-stretch flex flex-col items-center justify-center overflow-clip relative shrink-0 size-[16px]" data-node-id="100:807" data-name="calendar">
                <div className="relative shrink-0 size-[16px]" data-node-id="100:1271" data-name="calendar">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendar} />
                </div>
              </div>
              <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:809">
                Plan tomorrow?
              </p>
            </div>
            <div className="h-[20px] relative shrink-0 w-[36px]" data-node-id="100:810" data-name="toggle">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgToggle} />
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:812" data-name="actions">
            <div className="bg-[#d8b978] content-stretch flex items-start justify-center px-[16px] py-[14px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:813" data-name="end-day-btn">
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#0b0c0d] text-[14px] whitespace-nowrap" data-node-id="100:814">
                End my day
              </p>
            </div>
            <p className="[text-underline-position:from-font] [word-break:break-word] decoration-from-font decoration-solid font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] text-center underline w-full" data-node-id="100:815">
              Save and keep going
            </p>
          </div>
        </div>
      </div>
      <div className="content-stretch flex flex-col h-[24px] items-center justify-center relative shrink-0 w-full" data-node-id="100:816" data-name="safe-area">
        <div className="bg-[#34373a] h-[5px] relative rounded-[100px] shrink-0 w-[134px]" data-node-id="100:817" data-name="home-indicator" />
      </div>
    </div>
  );
}

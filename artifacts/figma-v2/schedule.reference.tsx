const imgCompass = "https://www.figma.com/api/mcp/asset/468d519a-723f-4eb4-a9c4-15b81164d44d.svg";
const imgMoon = "https://www.figma.com/api/mcp/asset/a441bbc9-684b-44b8-b21f-93910a02017d.svg";
const imgPlus = "https://www.figma.com/api/mcp/asset/ecf211ab-0a75-4b40-b5b7-5a32189a39b2.svg";
const imgChevronLeft = "https://www.figma.com/api/mcp/asset/7cea5fa0-75dd-406d-ba0d-53c20e0f8121.svg";
const imgCalendar = "https://www.figma.com/api/mcp/asset/a8a87978-86da-47ae-b15c-ebb09cbbf657.svg";
const imgChevronRight = "https://www.figma.com/api/mcp/asset/2675062b-0dee-4122-8551-26e30ed4859c.svg";
const imgPlus1 = "https://www.figma.com/api/mcp/asset/4003a48d-10a9-48a7-856d-7088b4abec67.svg";
const imgChevronDown = "https://www.figma.com/api/mcp/asset/1bfd5c8c-221d-4bed-91ce-7d192b6fdede.svg";
const imgCheckCircle = "https://www.figma.com/api/mcp/asset/c674625d-341f-4cdb-be33-af300ff66631.svg";
const imgHouse = "https://www.figma.com/api/mcp/asset/61d99da1-62d5-4e80-bee7-b4078c90d1fb.svg";
const imgCalendar1 = "https://www.figma.com/api/mcp/asset/459273a7-a676-487c-9828-e3db1b78de08.svg";
const imgTarget = "https://www.figma.com/api/mcp/asset/2e66d9bc-929a-4673-a008-eb8be2389096.svg";
const imgMenu = "https://www.figma.com/api/mcp/asset/08a85f2f-ad19-4645-aeef-d6780420e2cc.svg";
const imgPlus2 = "https://www.figma.com/api/mcp/asset/27032740-4fae-4dc6-88e3-6ad2b4e92f5f.svg";

export default function Screen3Schedule() {
  return (
    <div className="bg-[#0b0c0d] content-stretch flex flex-col items-start justify-between overflow-clip relative rounded-[24px] size-full" data-node-id="100:233" data-name="screen-3-schedule">
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="100:234" data-name="scrollable-content">
        <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative shrink-0 w-full" data-node-id="100:235" data-name="app-header">
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:236" data-name="logo-group">
            <div className="bg-[rgba(216,185,120,0.1)] border border-[#d8b978] border-solid content-stretch flex flex-col items-center justify-center relative rounded-[16px] shrink-0 size-[32px]" data-node-id="100:237" data-name="logo">
              <div className="relative shrink-0 size-[18px]" data-node-id="100:648" data-name="compass">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCompass} />
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-px items-start leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-node-id="100:239" data-name="title-group">
              <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[16px]" data-node-id="100:240">
                Caminos
              </p>
              <p className="font-['Inter:Medium'] font-medium relative shrink-0 text-[#a6aaae] text-[10px]" data-node-id="100:241">
                by Morgan
              </p>
            </div>
          </div>
          <div className="border border-[#34373a] border-solid content-stretch flex gap-[6px] items-center px-[12px] py-[8px] relative rounded-[20px] shrink-0" data-node-id="100:242" data-name="end-day-btn">
            <div className="relative shrink-0 size-[14px]" data-node-id="100:558" data-name="moon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMoon} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[12px] whitespace-nowrap" data-node-id="100:244">
              End day
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[12px] items-start p-[16px] relative shrink-0 w-full" data-node-id="100:245" data-name="content-body">
          <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-node-id="100:246" data-name="intro">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[11px] uppercase whitespace-nowrap" data-node-id="100:247">
              A little structure. Room to adapt.
            </p>
            <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="100:248" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[22px] whitespace-nowrap" data-node-id="100:249">
                Your schedule
              </p>
              <div className="relative shrink-0 size-[20px]" data-node-id="100:561" data-name="plus">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPlus} />
              </div>
            </div>
          </div>
          <div className="content-stretch flex items-center justify-between py-[8px] relative shrink-0 w-full" data-node-id="100:251" data-name="date-nav">
            <div className="relative shrink-0 size-[16px]" data-node-id="100:564" data-name="chevron-left">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronLeft} />
            </div>
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:253" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[14px] whitespace-nowrap" data-node-id="100:254">
                09/19/2026
              </p>
              <div className="relative shrink-0 size-[14px]" data-node-id="100:567" data-name="calendar">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendar} />
              </div>
            </div>
            <div className="relative shrink-0 size-[16px]" data-node-id="100:570" data-name="chevron-right">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronRight} />
            </div>
          </div>
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="100:257" data-name="control-row">
            <div className="bg-[#d8b978] content-stretch flex items-start px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:258" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#0b0c0d] text-[12px] whitespace-nowrap" data-node-id="100:259">
                Now
              </p>
            </div>
            <div className="border border-[#34373a] border-solid content-stretch flex gap-[6px] items-center px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:260" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[12px] whitespace-nowrap" data-node-id="100:261">
                Unscheduled
              </p>
              <div className="bg-[rgba(216,185,120,0.1)] content-stretch flex items-start px-[6px] py-[2px] relative rounded-[10px] shrink-0" data-node-id="100:262" data-name="Frame">
                <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[10px] whitespace-nowrap" data-node-id="100:263">
                  1
                </p>
              </div>
            </div>
            <div className="border border-[#34373a] border-solid content-stretch flex gap-[4px] items-center px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:264" data-name="Frame">
              <div className="relative shrink-0 size-[12px]" data-node-id="100:573" data-name="plus">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPlus1} />
              </div>
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[12px] whitespace-nowrap" data-node-id="100:266">
                Task
              </p>
            </div>
          </div>
          <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex items-center justify-between p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:267" data-name="template-dropdown">
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[13px] whitespace-nowrap" data-node-id="100:268">
              Apply a day template
            </p>
            <div className="relative shrink-0 size-[16px]" data-node-id="100:576" data-name="chevron-down">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronDown} />
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[16px] items-start pt-[8px] relative shrink-0 w-full" data-node-id="100:270" data-name="timeline-container">
            <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:271" data-name="timeline-row-9">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] w-[50px]" data-node-id="100:272">
                9:00 AM
              </p>
              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-node-id="100:273" data-name="Frame">
                <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[4px] items-start opacity-50 p-[10px] relative rounded-[8px] shrink-0 w-full" data-node-id="100:274" data-name="Frame">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="100:275" data-name="Frame">
                    <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[13px] whitespace-nowrap" data-node-id="100:276">
                      Morning routine
                    </p>
                    <div className="relative shrink-0 size-[14px]" data-node-id="100:579" data-name="check-circle">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCheckCircle} />
                    </div>
                  </div>
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:278">
                    Completed · 60 min
                  </p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:279" data-name="timeline-row-10">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] w-[50px]" data-node-id="100:280">
                10:00 AM
              </p>
              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-node-id="100:281" data-name="Frame">
                <div className="bg-[#191a1c] border-[#d8b978] border-b border-l-4 border-r border-solid border-t content-stretch flex flex-col gap-[4px] items-start p-[10px] relative rounded-[8px] shrink-0 w-full" data-node-id="100:282" data-name="Frame">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="100:283" data-name="Frame">
                    <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:284">
                      Build a little momentum
                    </p>
                    <div className="bg-[rgba(216,185,120,0.1)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[6px] shrink-0" data-node-id="100:285" data-name="badge">
                      <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[10px] uppercase whitespace-nowrap" data-node-id="100:286">
                        Active
                      </p>
                    </div>
                  </div>
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[11px] whitespace-nowrap" data-node-id="100:287">
                    In progress · 30 min
                  </p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-full" data-node-id="100:288" data-name="current-time-indicator">
              <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[10px] w-[50px]" data-node-id="100:289">
                10:10 AM
              </p>
              <div className="bg-[#d8b978] flex-[1_0_0] h-[2px] min-w-px relative" data-node-id="100:290" data-name="Rectangle" />
            </div>
            <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:291" data-name="timeline-row-11">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] w-[50px]" data-node-id="100:292">
                11:00 AM
              </p>
              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-node-id="100:293" data-name="Frame">
                <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[4px] items-start p-[10px] relative rounded-[8px] shrink-0 w-full" data-node-id="100:294" data-name="Frame">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="100:295" data-name="Frame">
                    <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:296">
                      Project check-in
                    </p>
                    <div className="bg-[rgba(29,78,216,0.12)] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[6px] shrink-0" data-node-id="100:297" data-name="badge">
                      <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#60a5fa] text-[10px] uppercase whitespace-nowrap" data-node-id="100:298">
                        Work
                      </p>
                    </div>
                  </div>
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:299">
                    Upcoming · 60 min
                  </p>
                </div>
              </div>
            </div>
            <div className="content-stretch flex gap-[12px] items-start relative shrink-0 w-full" data-node-id="100:300" data-name="timeline-row-14">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] w-[50px]" data-node-id="100:301">
                2:00 PM
              </p>
              <div className="content-stretch flex flex-[1_0_0] flex-col items-start min-w-px relative" data-node-id="100:302" data-name="Frame">
                <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col gap-[4px] items-start p-[10px] relative rounded-[8px] shrink-0 w-full" data-node-id="100:303" data-name="Frame">
                  <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="100:304" data-name="Frame">
                    <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:305">
                      Annual check-up
                    </p>
                    <div className="bg-[#34373a] content-stretch flex items-start px-[8px] py-[4px] relative rounded-[6px] shrink-0" data-node-id="100:306" data-name="badge">
                      <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[10px] uppercase whitespace-nowrap" data-node-id="100:307">
                        Personal
                      </p>
                    </div>
                  </div>
                  <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:308">
                    Upcoming · 60 min
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[#191a1c] border-[#34373a] border-solid border-t content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="100:309" data-name="bottom-nav">
        <div className="content-stretch flex h-[64px] items-center justify-between px-[24px] relative shrink-0 w-full" data-node-id="100:310" data-name="nav-tabs">
          <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0 w-[64px]" data-node-id="100:311" data-name="tab-Home">
            <div className="relative shrink-0 size-[20px]" data-node-id="100:582" data-name="house">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHouse} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:313">
              Home
            </p>
          </div>
          <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0 w-[64px]" data-node-id="100:314" data-name="tab-Schedule">
            <div className="relative shrink-0 size-[20px]" data-node-id="100:585" data-name="calendar">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendar1} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[11px] whitespace-nowrap" data-node-id="100:316">
              Schedule
            </p>
          </div>
          <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0 w-[64px]" data-node-id="100:317" data-name="tab-Goals">
            <div className="relative shrink-0 size-[20px]" data-node-id="100:588" data-name="target">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgTarget} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:319">
              Goals
            </p>
          </div>
          <div className="content-stretch flex flex-col gap-[4px] items-center relative shrink-0 w-[64px]" data-node-id="100:320" data-name="tab-More">
            <div className="relative shrink-0 size-[20px]" data-node-id="100:591" data-name="menu">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMenu} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Medium'] font-medium leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:322">
              More
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-col h-[12px] items-center justify-center relative shrink-0 w-full" data-node-id="100:323" data-name="safe-area-spacer">
          <div className="bg-[#34373a] h-[5px] relative rounded-[100px] shrink-0 w-[134px]" data-node-id="100:324" data-name="home-indicator" />
        </div>
      </div>
      <div className="absolute bg-[#d8b978] bottom-[92px] content-stretch drop-shadow-[0px_4px_6px_rgba(0,0,0,0.5)] flex gap-[6px] items-center px-[16px] py-[12px] right-[16px] rounded-[30px]" data-node-id="100:325" data-name="floating-add-button">
        <div className="relative shrink-0 size-[16px]" data-node-id="100:594" data-name="plus">
          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPlus2} />
        </div>
        <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#0b0c0d] text-[14px] whitespace-nowrap" data-node-id="100:327">
          Add
        </p>
      </div>
    </div>
  );
}

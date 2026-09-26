const imgCompass = "https://www.figma.com/api/mcp/asset/258fef86-a29f-48c9-8b03-df23c4dbafa6.svg";
const imgMoon = "https://www.figma.com/api/mcp/asset/a5c5ad67-f335-41e2-96d2-96ccc02677a1.svg";
const imgX = "https://www.figma.com/api/mcp/asset/5d37c652-b623-4872-893b-667d44013f06.svg";
const imgChevronUp = "https://www.figma.com/api/mcp/asset/24cdfe3b-c0c3-4e70-bac5-42517ca1c680.svg";
const imgCalendar = "https://www.figma.com/api/mcp/asset/5b9e18bf-c816-492d-905f-d26b7189fab5.svg";

export default function Screen4Addtask() {
  return (
    <div className="bg-[rgba(0,0,0,0.7)] content-stretch flex flex-col items-start justify-between overflow-clip relative rounded-[24px] size-full" data-node-id="100:328" data-name="screen-4-addtask">
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full" data-node-id="100:329" data-name="background-dimmed-scaffolding">
        <div className="content-stretch flex items-center justify-between px-[16px] py-[12px] relative shrink-0 w-full" data-node-id="100:330" data-name="app-header">
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:331" data-name="logo-group">
            <div className="bg-[rgba(216,185,120,0.1)] border border-[#d8b978] border-solid content-stretch flex flex-col items-center justify-center relative rounded-[16px] shrink-0 size-[32px]" data-node-id="100:332" data-name="logo">
              <div className="relative shrink-0 size-[18px]" data-node-id="100:651" data-name="compass">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCompass} />
              </div>
            </div>
            <div className="[word-break:break-word] content-stretch flex flex-col gap-px items-start leading-[normal] not-italic relative shrink-0 whitespace-nowrap" data-node-id="100:334" data-name="title-group">
              <p className="font-['Inter:Bold'] font-bold relative shrink-0 text-[#f4f2ed] text-[16px]" data-node-id="100:335">
                Caminos
              </p>
              <p className="font-['Inter:Medium'] font-medium relative shrink-0 text-[#a6aaae] text-[10px]" data-node-id="100:336">
                by Morgan
              </p>
            </div>
          </div>
          <div className="border border-[#34373a] border-solid content-stretch flex gap-[6px] items-center px-[12px] py-[8px] relative rounded-[20px] shrink-0" data-node-id="100:337" data-name="end-day-btn">
            <div className="relative shrink-0 size-[14px]" data-node-id="100:597" data-name="moon">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMoon} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[12px] whitespace-nowrap" data-node-id="100:339">
              End day
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[12px] items-start opacity-20 p-[16px] relative shrink-0 w-full" data-node-id="100:340" data-name="Frame">
          <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[22px] whitespace-nowrap" data-node-id="100:341">
            One moment...
          </p>
          <div className="bg-[#191a1c] border border-[#34373a] border-solid content-stretch flex flex-col h-[100px] items-start p-[16px] relative rounded-[16px] shrink-0 w-full" data-node-id="100:342" data-name="dummy" />
        </div>
      </div>
      <div className="bg-[#191a1c] border-[#34373a] border-solid border-t content-stretch flex flex-col gap-[16px] items-start p-[20px] relative rounded-tl-[24px] rounded-tr-[24px] shrink-0 w-full" data-node-id="100:343" data-name="bottom-sheet">
        <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="100:344" data-name="Frame">
          <p className="[word-break:break-word] font-['Inter:Extra_Bold'] font-extrabold leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[18px] whitespace-nowrap" data-node-id="100:345">
            New task
          </p>
          <div className="relative shrink-0 size-[20px]" data-node-id="100:600" data-name="x">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgX} />
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0 w-full" data-node-id="100:347" data-name="Frame">
          <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] whitespace-nowrap" data-node-id="100:348">
            What needs doing?
          </p>
          <div className="bg-[#0b0c0d] border border-[#d8b978] border-solid content-stretch flex gap-[8px] items-center px-[16px] py-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:349" data-name="Frame">
            <p className="[word-break:break-word] flex-[1_0_0] font-['Inter:Regular'] font-normal leading-[normal] min-w-px not-italic relative text-[#f4f2ed] text-[16px]" data-node-id="100:350">
              Call dentist
            </p>
            <div className="bg-[#d8b978] h-[18px] relative shrink-0 w-[2px]" data-node-id="100:351" data-name="Rectangle" />
          </div>
        </div>
        <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-node-id="100:352" data-name="Frame">
          <div className="bg-[rgba(216,185,120,0.1)] border border-[#d8b978] border-solid content-stretch flex items-start px-[16px] py-[8px] relative rounded-[20px] shrink-0" data-node-id="100:353" data-name="Frame">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[12px] whitespace-nowrap" data-node-id="100:354">
              Personal
            </p>
          </div>
          <div className="border border-[#34373a] border-solid content-stretch flex items-start px-[16px] py-[8px] relative rounded-[20px] shrink-0" data-node-id="100:355" data-name="Frame">
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] whitespace-nowrap" data-node-id="100:356">
              Work
            </p>
          </div>
        </div>
        <div className="content-stretch flex items-center justify-between py-[4px] relative shrink-0 w-full" data-node-id="100:357" data-name="Frame">
          <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[12px] whitespace-nowrap" data-node-id="100:358">
            MORE OPTIONS
          </p>
          <div className="relative shrink-0 size-[16px]" data-node-id="100:603" data-name="chevron-up">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgChevronUp} />
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[8px] items-start relative shrink-0 w-full" data-node-id="100:360" data-name="Frame">
          <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:361">
            Duration
          </p>
          <div className="content-stretch flex gap-[6px] items-start relative shrink-0 w-full" data-node-id="100:362" data-name="Frame">
            <div className="border border-[#34373a] border-solid content-stretch flex items-start px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:363" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:364">
                15m
              </p>
            </div>
            <div className="bg-[rgba(216,185,120,0.1)] border border-[#d8b978] border-solid content-stretch flex items-start px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:365" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[11px] whitespace-nowrap" data-node-id="100:366">
                30m
              </p>
            </div>
            <div className="border border-[#34373a] border-solid content-stretch flex items-start px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:367" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:368">
                1h
              </p>
            </div>
            <div className="border border-[#34373a] border-solid content-stretch flex items-start px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:369" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:370">
                2h
              </p>
            </div>
            <div className="border border-[#34373a] border-solid content-stretch flex items-start px-[12px] py-[6px] relative rounded-[100px] shrink-0" data-node-id="100:371" data-name="Frame">
              <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#a6aaae] text-[11px] whitespace-nowrap" data-node-id="100:372">
                Custom
              </p>
            </div>
          </div>
        </div>
        <div className="border border-[#34373a] border-solid content-stretch flex items-center justify-between p-[12px] relative rounded-[12px] shrink-0 w-full" data-node-id="100:373" data-name="Frame">
          <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-node-id="100:374" data-name="Frame">
            <div className="relative shrink-0 size-[14px]" data-node-id="100:606" data-name="calendar">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgCalendar} />
            </div>
            <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#f4f2ed] text-[13px] whitespace-nowrap" data-node-id="100:376">
              Schedule for today
            </p>
          </div>
          <p className="[word-break:break-word] font-['Inter:Regular'] font-normal leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[13px] whitespace-nowrap" data-node-id="100:377">
            10:30 AM
          </p>
        </div>
        <div className="content-stretch flex gap-[8px] items-start relative shrink-0 w-full" data-node-id="100:378" data-name="Frame">
          <div className="border border-[#d8b978] border-solid content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[16px] py-[12px] relative rounded-[12px]" data-node-id="100:379" data-name="Frame">
            <p className="[word-break:break-word] font-['Inter:Semi_Bold'] font-semibold leading-[normal] not-italic relative shrink-0 text-[#d8b978] text-[14px] whitespace-nowrap" data-node-id="100:380">{`Save & schedule`}</p>
          </div>
          <div className="bg-[#d8b978] content-stretch flex flex-[1_0_0] items-start justify-center min-w-px px-[16px] py-[12px] relative rounded-[12px]" data-node-id="100:381" data-name="Frame">
            <p className="[word-break:break-word] font-['Inter:Bold'] font-bold leading-[normal] not-italic relative shrink-0 text-[#0b0c0d] text-[14px] whitespace-nowrap" data-node-id="100:382">
              Save
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

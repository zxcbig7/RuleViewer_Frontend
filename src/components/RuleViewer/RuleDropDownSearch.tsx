import { Input } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

const { Search } = Input;

/**
 * DropdownProps
 * - options：可選的 Rule 名稱清單
 * - onSelect：使用者確認選擇時通知父層
 */
type DropdownProps = {
  options?: string[];
  onSelect?: (value: string) => void;
};

function RuleDropdownSearch({ options, onSelect }: DropdownProps) {

  // inputValue：input 欄位顯示的文字（受控元件）
  const [inputValue, setInputValue] = useState("");

  // open：控制下拉選單是否顯示
  const [open, setOpen] = useState(false);

  // wrapperRef：指向整個 dropdown，用來判斷是否點擊在元件外
  const wrapperRef = useRef<HTMLDivElement>(null);

  // filteredOptions：依 inputValue 即時過濾 options（不分大小寫）
  const filteredOptions = useMemo(() => {
    const keyword = inputValue.trim();
    if (keyword === "") return options;
    return options?.filter((o) =>
      o.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
    );
  }, [options, inputValue]);

  // 點擊元件外部時關閉下拉選單
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // dropdown 外層容器（用 ref 判斷外部點擊）
    <div ref={wrapperRef} className="relative w-[240px]">

      {/* 搜尋輸入框（antd Search） */}
      <Search
        value={inputValue}
        placeholder="Input Rule Name"
        allowClear
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onSearch={() => onSelect?.(inputValue)}
        enterButton
      />

      {/* 下拉選單（只在 open 時顯示） */}
      {open && (
        <ul className="absolute top-full left-0 mt-1 max-h-[200px] overflow-y-auto border border-[#ccc] bg-white list-none p-0 m-0 z-[1000]">

          {/* 沒有符合項目時顯示提示 */}
          {filteredOptions?.length === 0 && (
            <li className="px-[10px] py-[6px] text-[#888] cursor-default">No matches</li>
          )}

          {/* 顯示過濾後的選項 */}
          {filteredOptions?.map((opt) => (
            <li
              key={opt}
              className="px-[10px] py-[6px] cursor-pointer hover:bg-[#f0f0f0]"
              onClick={() => {
                setInputValue(opt);
                setOpen(false);
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RuleDropdownSearch;

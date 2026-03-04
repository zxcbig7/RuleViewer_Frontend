// ============================================================
// RuleDropdownSearch.tsx
// Toolbar 左側：選擇要查看的 Rule（含即時過濾下拉）
// ============================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "antd";

const { Search } = Input;

type RuleDropdownSearchProps = {
  options: string[];
  onSelect?: (value: string) => void;
};

export function RuleDropdownSearch({ options, onSelect }: RuleDropdownSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    const keyword = inputValue.trim();
    if (keyword === "") return options;
    return options.filter((o) =>
      o.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
    );
  }, [options, inputValue]);

  // 點擊元件外部時關閉下拉
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
    <div ref={wrapperRef} className="relative w-[240px]">
      <Search
        value={inputValue}
        placeholder="Input Rule Name"
        allowClear
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onSearch={() => {
          onSelect?.(inputValue);
        }}
        enterButton
      />

      {open && (
        <ul className="absolute top-full left-0 mt-1 max-h-[200px] overflow-y-auto border border-[#ccc] bg-white list-none p-0 m-0 z-[1000]">
          {filteredOptions.length === 0 && (
            <li className="px-[10px] py-[6px] text-[#888] cursor-default">No matches</li>
          )}
          {filteredOptions.map((opt) => (
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

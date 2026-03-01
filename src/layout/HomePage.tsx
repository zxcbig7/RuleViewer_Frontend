import React, { useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";


import { ImCalculator } from "react-icons/im";

import {
  DesktopOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Breadcrumb, Layout, Menu, theme } from "antd";

const { Content, Sider } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  return { key, icon, children, label } as MenuItem;
}

const items: MenuItem[] = [
  getItem("Dashboard", "/dashboard", <PieChartOutlined />),
  getItem("Rule Viewer", "/ruleviewer", <DesktopOutlined />),

  getItem("Sudoku Solver", "/sudoku", <ImCalculator />),

  // 父節點建議不要導頁，用 sub key
  getItem("Rule Viewer", "", <DesktopOutlined />, [
    getItem("Main Page", "/ruleviewer/main"),
    getItem("Layout", "/ruleviewer/test1"),
    getItem("Canvas", "/ruleviewer/test2"),
    getItem("Block Info", "/ruleviewer/test3"),
  ]),
];

const HomePage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const selectedKeys = useMemo(() => [location.pathname], [location.pathname]);

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    const key = String(e.key);
    // 只有 / 開頭的才當路由導頁，sub-menu 的 key 不導頁
    if (key.startsWith("/")) navigate(key);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div className="demo-logo-vertical" />
        <Menu
          theme="dark"
          mode="inline"
          items={items}
          selectedKeys={selectedKeys}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/*<Header style={{ padding: 0, background: colorBgContainer }} />*/}
        <Content
          style={{
            margin: 0,
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            padding: 16, // ✅ 改成內距
          }}>
          <Breadcrumb style={{ margin: "0 0 0px 0" }} /> {/* 麵包屑導覽：顯示「目前頁面在網站階層中的位置」 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: 24,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              overflow: "auto",
            }}
          >
            <Outlet /> {/* 右邊內容由 App.tsx 的子路由決定 */}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default HomePage;

import React from 'react';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import RuleViewer from '../pages/RuleViewer';

const { Header, Content, Footer } = Layout;


// 導覽列
const navitems = ["RTD", "LSD", "SBB"];
const items = navitems.map((value, index) => ({
  key: index + 1,
  label: value + ` (${index + 1})`,
}));

const HomePage: React.FC = () => {
  // theme.useToken() 是 Ant Design v5 提供的 Hook。
  const { token: { colorBgContainer, borderRadiusLG }, } = theme.useToken();

  return (
    <Layout>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <div className="demo-logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['2']}
          items={items}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>

      <Content style={{ padding: '0 48px' }}>
        <Breadcrumb
          style={{ margin: '16px 0' }}
          items={[{ title: 'Home' }, { title: 'List' }, { title: 'App' }]}
        />
        <div
          style={{
            background: colorBgContainer,
            minHeight: 0,
            padding: 24,
            borderRadius: borderRadiusLG,
          }}
        >
          <RuleViewer />
        </div>
      </Content>


      <Footer style={{ textAlign: 'center' }}>
        Ant Design ©{new Date().getFullYear()} Created by Ant UED
      </Footer>
    </Layout>
  );
};

export default HomePage;


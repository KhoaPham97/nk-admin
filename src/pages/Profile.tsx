import { FC } from "react";
import { useAppSelector } from "../redux/hooks";

const Profile: FC = () => {
  const info: any = useAppSelector((state) => state.authReducer.userInfo);

  return (
    <div className="container mx-auto min-h-[83vh] w-full max-w-5xl dark:text-white">
      <h1 className="text-4xl p-4 font-bold font-lora">Your Account</h1>
      <div className=" grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-1 p-4">
        <img src={info?.image} alt="" className="text-center" />
        <table>
          <tbody>
            <tr>
              <td className="font-bold">Username</td>
              <td>{info?.username}</td>
            </tr>
            <tr>
              <td className="font-bold w-32">Tên</td>
              <td>{info?.maidenName}</td>
            </tr>
            <tr>
              <td className="font-bold">Email</td>
              <td>{info?.email}</td>
            </tr>
            <tr>
              <td className="font-bold">SĐT</td>
              <td>{info?.phone}</td>
            </tr>
          </tbody>
        </table>
        <div className="space-y-2">
          <div>
            <h1 className="font-bold">Địa chỉ</h1>
            <p>{info?.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
